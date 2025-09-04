import { Inject, Injectable } from '@angular/core';
import { createDefaultArtifactName, formatBase64Data, processThoughtText, sanitizeContentText } from '../core/chat.utils';
import { getMediaTypeFromMimetype } from '../../artifact-tab/artifact-tab.component';
import { ChatArtifactService } from './chat-artifact.service';
import { ChatOauthService } from './chat-oauth.service';
import { AgentRunRequest } from '../../../core/models/AgentRunRequest';
import { AGENT_SERVICE, AgentService } from '../../../core/services/agent.service';
import { catchError, of } from 'rxjs';
import { ChatStoreService } from './chat-store.service';

@Injectable({ providedIn: 'root' })
export class ChatStreamService {
  constructor(
    private chatArtifactService: ChatArtifactService,
    private chatOauthService: ChatOauthService,
    @Inject(AGENT_SERVICE) private agentService: AgentService,
    private store: ChatStoreService,
  ) {}

  async sendMessage(ctx: any, event: Event) {
    if (ctx.messages.length === 0) {
      ctx.scrollContainer.nativeElement.addEventListener('wheel', () => {
        this.store.scrollInterrupted.set(true);
      });
      ctx.scrollContainer.nativeElement.addEventListener('touchmove', () => {
        this.store.scrollInterrupted.set(true);
      });
    }
    this.store.scrollInterrupted.set(false);

    this.store.isModelThinking.set(true);

    event.preventDefault();
    if (!ctx.userInput.trim() && ctx.selectedFiles.length <= 0) return;

    // ctx.loggingService.log(ctx.userInput);

    if (event instanceof KeyboardEvent) {
      if ((event as KeyboardEvent).isComposing || (event as KeyboardEvent).keyCode === 229) {
        return;
      }
    }

    if (!!ctx.userInput.trim()) {
      ctx.messages.push({ role: 'user', text: ctx.userInput });
      this.store.setMessages(ctx.messages);
    }

    if (ctx.selectedFiles.length > 0) {
      const messageAttachments = ctx.selectedFiles.map((file: any) => ({ file: file.file, url: file.url }));
      ctx.messages.push({ role: 'user', attachments: messageAttachments });
      this.store.setMessages(ctx.messages);
    }

    // Ensure a visible thinking indicator appears immediately
    const last = ctx.messages[ctx.messages.length - 1];
    if (!last || !last.isLoading) {
      ctx.messages.push({ role: 'bot', isLoading: true });
      this.store.setMessages(ctx.messages);
    }

    const req: AgentRunRequest = {
      appName: ctx.appName,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      newMessage: { role: 'user', parts: await this.getUserMessageParts(ctx) },
      streaming: ctx.useSse,
      stateDelta: ctx.updatedSessionState(),
    };
    ctx.selectedFiles = [];
    let index = ctx.eventMessageIndexArray.length - 1;
    ctx.streamingTextMessage = null;
    this.agentService.runSse(req).subscribe({
      next: async (chunk) => {
        if (chunk.startsWith('{"error"')) {
          ctx.openSnackBar(chunk, 'OK');
          return;
        }
        const chunkJson = JSON.parse(chunk);
        if (chunkJson.error) {
          ctx.openSnackBar(chunkJson.error, 'OK');
          return;
        }
        if (chunkJson.content) {
          for (let part of chunkJson.content.parts) {
            index += 1;
            this.processPart(ctx, chunkJson, part, index, ctx.useSse);
            ctx.traceService.setEventData(ctx.eventData);
          }
        } else if (chunkJson.errorMessage) {
          this.processErrorMessage(ctx, chunkJson, index)
        }
        ctx.changeDetectorRef.detectChanges();
      },
      error: (err) => {
        console.error('SSE error:', err);
        this.store.isModelThinking.set(false);
      },
      complete: () => {
        this.store.isModelThinking.set(false);
        ctx.streamingTextMessage = null;
        ctx.sessionTab.reloadSession(ctx.sessionId);
        ctx.eventService.getTrace(ctx.sessionId)
            .pipe(catchError((error: any) => {
              if (error.status === 404) {
                return of(null);
              }
              return of([]);
            }))
            .subscribe((res: any) => {
              ctx.traceData = res;
              ctx.changeDetectorRef.detectChanges();
            });
        ctx.traceService.setMessages(ctx.messages);
      },
    });
    ctx.userInput = '';
    ctx.updatedSessionState.set(null);
    ctx.changeDetectorRef.detectChanges();
  }

  private async getUserMessageParts(ctx: any) {
    let parts: any = [];
    if (!!ctx.userInput.trim()) {
      parts.push({ text: `${ctx.userInput}` });
    }
    if (ctx.selectedFiles.length > 0) {
      for (const file of ctx.selectedFiles) {
        parts.push({
          inlineData: {
            displayName: file.file.name,
            data: await this.readFileAsBytes(file.file),
            mimeType: file.file.type,
          },
        });
      }
    }
    return parts;
  }

  private readFileAsBytes(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Data = e.target.result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  processRunSseResponse(ctx: any, response: any) {
    let index = ctx.eventMessageIndexArray.length - 1;
    for (const e of response) {
      if (e.content) {
        for (let part of e.content.parts) {
          index += 1;
          this.processPart(ctx, e, part, index, ctx.useSse);
        }
      }
    }
  }

  processErrorMessage(ctx: any, chunkJson: any, index: number) {
    this.storeEvents(ctx, chunkJson, chunkJson, index);
    ctx.insertMessageBeforeLoadingMessage({ text: chunkJson.errorMessage, role: 'bot' });
  }

  processPart(ctx: any, chunkJson: any, part: any, index: number, useSse: boolean) {
    const renderedContent = chunkJson.groundingMetadata?.searchEntryPoint?.renderedContent;

    if (part.text) {
      // If this is a thought, keep the typing indicator visible
      const newChunk = part.text;
      if (part.thought) {
        if (newChunk !== ctx.latestThought) {
          this.storeEvents(ctx, part, chunkJson, index);
          const thoughtMessage = { role: 'bot', text: processThoughtText(newChunk), thought: true, eventId: chunkJson.id };
          ctx.insertMessageBeforeLoadingMessage(thoughtMessage);
        }
        ctx.latestThought = newChunk;
        // Still thinking; keep indicator on
        this.store.isModelThinking.set(true);
      } else if (!ctx.streamingTextMessage) {
        // First non-thought token: remove thinking indicator if present
        const last = ctx.messages[ctx.messages.length - 1];
        if (last?.isLoading) {
          ctx.messages.pop();
          this.store.setMessages(ctx.messages);
        }
        this.store.isModelThinking.set(false);
        ctx.streamingTextMessage = { role: 'bot', text: processThoughtText(newChunk), thought: !!part.thought, eventId: chunkJson.id };
        if (renderedContent) {
          ctx.streamingTextMessage.renderedContent = chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
        }
        ctx.insertMessageBeforeLoadingMessage(ctx.streamingTextMessage);
        if (!useSse) {
          this.storeEvents(ctx, part, chunkJson, index);
          ctx.eventMessageIndexArray[index] = newChunk;
          ctx.streamingTextMessage = null;
          return;
        }
      } else {
        if (renderedContent) {
          ctx.streamingTextMessage.renderedContent = chunkJson.groundingMetadata.searchEntryPoint.renderedContent;
        }
        // Support both cumulative and delta chunking from the server.
        const previousText = ctx.streamingTextMessage.text || '';
        let nextText = newChunk;
        if (!newChunk.startsWith(previousText)) {
          // Treat as delta token chunk
          nextText = previousText + newChunk;
        }
        // Directly update the visible text for smooth, immediate streaming
        ctx.streamingTextMessage.text = sanitizeContentText(nextText);
        this.store.streamingTextMessage.set(ctx.streamingTextMessage);
        // Keep event index updated with the latest full text
        this.storeEvents(ctx, part, chunkJson, index);
        ctx.eventMessageIndexArray[index] = nextText;
      }
    } else if (!part.thought) {
      // Non-text and not a thought update -> not "thinking"
      this.store.isModelThinking.set(false);
      this.storeEvents(ctx, part, chunkJson, index);
      this.storeMessage(ctx, part, chunkJson, index, chunkJson.author === 'user' ? 'user' : 'bot');
    } else {
      this.store.isModelThinking.set(true);
    }
  }

  storeMessage(
    ctx: any,
    part: any,
    e: any,
    index: number,
    role: string,
    invocationIndex?: number,
    additionalIndeces?: any,
  ) {
    if (e?.author) {
      ctx.createAgentIconColorClass(e.author);
    }

    if (e?.longRunningToolIds && e.longRunningToolIds.length > 0) {
      this.getAsyncFunctionsFromParts(ctx, e.longRunningToolIds, e.content.parts);
      const func = ctx.longRunningEvents[0];
      if (func.args.authConfig && func.args.authConfig.exchangedAuthCredential && func.args.authConfig.exchangedAuthCredential.oauth2) {
        const authUri = func.args.authConfig.exchangedAuthCredential.oauth2.authUri;
        const updatedAuthUri = ctx.updateRedirectUri ? ctx.updateRedirectUri(authUri, ctx.redirectUri) : authUri;
        this.chatOauthService.openOAuthPopup(updatedAuthUri)
          .then((authResponseUrl) => {
            ctx.functionCallEventId = e.id;
            this.chatOauthService
              .sendOAuthResponse(
                func,
                authResponseUrl,
                ctx.redirectUri,
                ctx.appName,
                ctx.userId,
                ctx.sessionId,
                ctx.functionCallEventId,
              )
              .subscribe((response) => {
                ctx.longRunningEvents.pop();
                ctx.processRunSseResponse(response);
              });
          })
          .catch((error) => {
            console.error('OAuth Error:', error);
          });
      } else {
        ctx.functionCallEventId = e.id;
      }
    }
    if (e?.actions && e.actions.artifactDelta) {
      for (const key in e.actions.artifactDelta) {
        if (e.actions.artifactDelta.hasOwnProperty(key)) {
          this.renderArtifact(ctx, key, e.actions.artifactDelta[key], e);
        }
      }
    }

    if (e?.evalStatus) {
      ctx.isChatMode.set(false);
    }

    const message: any = {
      role,
      evalStatus: e?.evalStatus,
      failedMetric: e?.failedMetric,
      evalScore: e?.evalScore,
      evalThreshold: e?.evalThreshold,
      actualInvocationToolUses: e?.actualInvocationToolUses,
      expectedInvocationToolUses: e?.expectedInvocationToolUses,
      actualFinalResponse: e?.actualFinalResponse,
      expectedFinalResponse: e?.expectedFinalResponse,
      invocationIndex: invocationIndex !== undefined ? invocationIndex : undefined,
      finalResponsePartIndex: additionalIndeces?.finalResponsePartIndex !== undefined ? additionalIndeces.finalResponsePartIndex : undefined,
      toolUseIndex: additionalIndeces?.toolUseIndex !== undefined ? additionalIndeces.toolUseIndex : undefined,
    };
    if (part.inlineData) {
      const base64Data = formatBase64Data(part.inlineData.data, part.inlineData.mimeType);
      message.inlineData = {
        displayName: part.inlineData.displayName,
        data: base64Data,
        mimeType: part.inlineData.mimeType,
      };
      ctx.eventMessageIndexArray[index] = part.inlineData;
    } else if (part.text) {
      message.text = sanitizeContentText(part.text);
      message.thought = part.thought ? true : false;
      if (e?.groundingMetadata && e.groundingMetadata.searchEntryPoint && e.groundingMetadata.searchEntryPoint.renderedContent) {
        message.renderedContent = e.groundingMetadata.searchEntryPoint.renderedContent;
      }
      message.eventId = e?.id;
      ctx.eventMessageIndexArray[index] = message.text;
    } else if (part.functionCall) {
      message.functionCall = part.functionCall;
      message.eventId = e?.id;
      ctx.eventMessageIndexArray[index] = part.functionCall;
    } else if (part.functionResponse) {
      message.functionResponse = part.functionResponse;
      message.eventId = e?.id;
      ctx.eventMessageIndexArray[index] = part.functionResponse;
    } else if (part.executableCode) {
      message.executableCode = part.executableCode;
      ctx.eventMessageIndexArray[index] = part.executableCode;
    } else if (part.codeExecutionResult) {
      message.codeExecutionResult = part.codeExecutionResult;
      ctx.eventMessageIndexArray[index] = part.codeExecutionResult;
      if (e.actions && e.actions.artifact_delta) {
        for (const key in e.actions.artifact_delta) {
          if (e.actions.artifact_delta.hasOwnProperty(key)) {
            this.renderArtifact(ctx, key, e.actions.artifact_delta[key]);
          }
        }
      }
    }

    if (Object.keys(part).length > 0) {
      ctx.insertMessageBeforeLoadingMessage(message);
    }
  }

  private renderArtifact(ctx: any, artifactId: string, versionId: string, sourceEvent?: any) {
    // Try to infer the tool/function name from the event title or author
    let toolName = '';
    const title: string | undefined = sourceEvent?.title;
    if (title && title.includes('functionCall:')) {
      toolName = title.split('functionCall:')[1]?.split(':')[0] ?? '';
    } else if (sourceEvent?.author && sourceEvent.author !== 'bot') {
      toolName = sourceEvent.author;
    }
    if (!toolName) {
      const raw = sourceEvent?.actions?.toolName || sourceEvent?.functionCall?.name || 'tool';
      toolName = (raw || '').replace(/\s*tool reported:?$/i, '');
    }

    // Show a human-readable placeholder instead of an empty bubble while fetching
    const message = { role: 'bot', text: `Using ${toolName}…`, pendingArtifact: true, toolName, pendingArtifactId: artifactId } as any;
    ctx.insertMessageBeforeLoadingMessage(message);
    const currentIndex = ctx.messages.length - 2;

    this.chatArtifactService
      .getArtifact(ctx.userId, ctx.appName, ctx.sessionId, artifactId, versionId)
      .subscribe(({ data, mimeType }) => {
        const base64Data = data;
        const mediaType = getMediaTypeFromMimetype(mimeType);
        const inlineData = { name: createDefaultArtifactName(mimeType), data: base64Data, mimeType, mediaType };
        // Replace only the matching pending placeholder to avoid duplicates
        const pendingIndex = ctx.messages.findIndex((m: any) => m.pendingArtifact && m.pendingArtifactId === artifactId);
        const replaceIndex = pendingIndex >= 0 ? pendingIndex : currentIndex;
        ctx.messages[replaceIndex] = { role: 'bot', inlineData, toolName } as any;
        ctx.artifacts = [...ctx.artifacts, { id: artifactId, data: base64Data, mimeType, versionId, mediaType }];
      });
  }

  storeEvents(ctx: any, part: any, e: any, index: number) {
    let title = '';
    if (part.text) {
      title += 'text:' + part.text;
    } else if (part.functionCall) {
      title += 'functionCall:' + part.functionCall.name;
    } else if (part.functionResponse) {
      title += 'functionResponse:' + part.functionResponse.name;
    } else if (part.executableCode) {
      title += 'executableCode:' + part.executableCode.code.slice(0, 10);
    } else if (part.codeExecutionResult) {
      title += 'codeExecutionResult:' + part.codeExecutionResult.outcome;
    } else if (part.errorMessage) {
      title += 'errorMessage:' + part.errorMessage;
    }
    e.title = title;
    ctx.eventData.set(e.id, e);
    ctx.eventData = new Map(ctx.eventData);
  }

  private getAsyncFunctionsFromParts(ctx: any, pendingIds: any[], parts: any[]) {
    for (const part of parts) {
      if (part.functionCall && pendingIds.includes(part.functionCall.id)) {
        ctx.longRunningEvents.push(part.functionCall);
      }
    }
  }
}


