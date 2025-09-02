import {DOCUMENT, Location} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, Inject, inject, OnDestroy, OnInit, Renderer2, signal, ViewChild, WritableSignal} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {FormControl} from '@angular/forms';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatPaginatorIntl} from '@angular/material/paginator';
import {MatDrawer} from '@angular/material/sidenav';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {instance} from '@viz-js/viz';
import {BehaviorSubject, catchError, combineLatest, distinctUntilChanged, filter, map, Observable, of, shareReplay, switchMap, take, tap} from 'rxjs';
import stc from 'string-to-color';
import { ROOT_AGENT, CustomPaginatorIntl, BIDI_STREAMING_RESTART_WARNING, LLM_REQUEST_KEY, LLM_RESPONSE_KEY } from './core/chat.constants';
import { formatBase64Data, createDefaultArtifactName, processThoughtText, updateRedirectUri } from './core/chat.utils';
import { ChatMessage, ArtifactView, EventData } from './core/chat.models';

import {URLUtil} from '../../../utils/url-util';
import {AgentRunRequest} from '../../core/models/AgentRunRequest';
import {Session} from '../../core/models/Session';
import {AgentService, AGENT_SERVICE} from '../../core/services/agent.service';
import {ArtifactService, ARTIFACT_SERVICE} from '../../core/services/artifact.service';
import { ChatArtifactService } from './services/chat-artifact.service';
import { ChatOauthService } from './services/chat-oauth.service';
import { ChatRoutingService } from './services/chat-routing.service';
import {AudioService, AUDIO_SERVICE} from '../../core/services/audio.service';
import {DownloadService, DOWNLOAD_SERVICE} from '../../core/services/download.service';
import {EvalService, EVAL_SERVICE} from '../../core/services/eval.service';
import {EventService, EVENT_SERVICE} from '../../core/services/event.service';
import { ChatEventService } from './services/chat-event.service';
import {FeatureFlagService, FEATURE_FLAG_SERVICE} from '../../core/services/feature-flag.service';
import {SessionService, SESSION_SERVICE} from '../../core/services/session.service';
import {TraceService, TRACE_SERVICE} from '../../core/services/trace.service';
import {VideoService, VIDEO_SERVICE} from '../../core/services/video.service';
import {WebSocketService, WEBSOCKET_SERVICE} from '../../core/services/websocket.service';
import { ChatRecordingService } from './services/chat-recording.service';
import { ChatSessionService } from './services/chat-session.service';
import {ResizableDrawerDirective} from '../../directives/resizable-drawer.directive';
import {getMediaTypeFromMimetype, MediaType, openBase64InNewTab} from '../artifact-tab/artifact-tab.component';
import { ChatStreamService } from './services/chat-stream.service';
import { ChatStoreService } from './services/chat-store.service';
import { ChatEvalService } from './services/chat-eval.service';
import { ChatSessionViewService } from './services/chat-session-view.service';
import { UsageGateService } from '../saas/usage-gate.service';
import {AudioPlayerComponent} from '../audio-player/audio-player.component';
import {EditJsonDialogComponent} from '../edit-json-dialog/edit-json-dialog.component';
import {EvalCase, EvalTabComponent} from '../eval-tab/eval-tab.component';
import {EventTabComponent} from '../event-tab/event-tab.component';
import {PendingEventDialogComponent} from '../pending-event-dialog/pending-event-dialog.component';
import {
  DeleteSessionDialogComponent,
  DeleteSessionDialogData,
} from '../session-tab/delete-session-dialog/delete-session-dialog.component';
import {SessionTabComponent} from '../session-tab/session-tab.component';
import {ViewImageDialogComponent} from '../view-image-dialog/view-image-dialog.component';

 

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: MatPaginatorIntl, useClass: CustomPaginatorIntl }],
})
export class ChatComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoContainer', { read: ElementRef })
  videoContainer!: ElementRef;
  @ViewChild('sideDrawer') sideDrawer!: MatDrawer;
  @ViewChild(EventTabComponent) eventTabComponent!: EventTabComponent;
  @ViewChild(SessionTabComponent) sessionTab!: SessionTabComponent;
  @ViewChild(EvalTabComponent) evalTab!: EvalTabComponent;
  @ViewChild('autoScroll') private scrollContainer!: ElementRef;
  @ViewChild('messageTextarea') private textarea: ElementRef | undefined;
  @ViewChild('bottomPanel') bottomPanelRef!: ElementRef;
  private _snackBar = inject(MatSnackBar);
  shouldShowEvalTab = signal(true);
  enableSseIndicator = signal(true);
  isChatMode = signal(true);
  isEvalCaseEditing = signal(false);
  hasEvalCaseChanged = signal(false);
  isEvalEditMode = signal(false);
  videoElement!: HTMLVideoElement;
  currentMessage = '';
  messages: ChatMessage[] = [];
  lastTextChunk: string = '';
  streamingTextMessage: (ChatMessage & { text?: string; renderedContent?: string }) | null = null;
  latestThought: string = '';
  artifacts: ArtifactView[] = [];
  userInput: string = '';
  userEditEvalCaseMessage: string = '';
  userId = 'user';
  appName = '';
  sessionId = ``;
  evalCase: EvalCase | null = null;
  updatedEvalCase: EvalCase | null = null;
  evalSetId = '';
  isAudioRecording = false;
  isVideoRecording = false;
  longRunningEvents: any[] = [];
  functionCallEventId = '';
  redirectUri = URLUtil.getBaseUrlWithoutPath();
  showSidePanel = true;
  useSse = true;
  currentSessionState = {};
  root_agent = ROOT_AGENT;
  updatedSessionState = signal(null);
  private readonly store = inject(ChatStoreService);

  // TODO: Remove this once backend supports restarting bidi streaming.
  sessionHasUsedBidi = new Set<string>();

  eventData = new Map<string, EventData>();
  traceData: any[] = [];
  eventMessageIndexArray: any[] = [];
  renderedEventGraph: SafeHtml | undefined;
  rawSvgString: string | null = null;

  selectedEvent: any = undefined;
  selectedEventIndex: any = undefined;
  llmRequest: any = undefined;
  llmResponse: any = undefined;
  llmRequestKey = LLM_REQUEST_KEY;
  llmResponseKey = LLM_RESPONSE_KEY;

  getMediaTypeFromMimetype = getMediaTypeFromMimetype;

  selectedFiles: { file: File; url: string }[] = [];
  private previousMessageCount = 0;

  protected openBase64InNewTab = openBase64InNewTab;
  protected MediaType = MediaType;
  usageGate = inject(UsageGateService);
  usageGateDismissed = false;

  // Sync query params with value from agent picker.
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  protected readonly selectedAppControl = new FormControl<string>('', {
    nonNullable: true,
  });

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  // Load apps
  protected isLoadingApps: WritableSignal<boolean> = signal(false);
  protected loadingError: WritableSignal<string> = signal('');
  protected readonly apps$: Observable<string[] | undefined> = of([]).pipe(
    tap(() => {
      this.isLoadingApps.set(true);
      this.selectedAppControl.disable();
    }),
    switchMap(
      () => this.agentService.listApps().pipe(
        catchError((err: HttpErrorResponse) => {
          this.loadingError.set(err.message);
          return of(undefined);
        }),
      ),
    ),
    take(1),
    tap((app) => {
      this.isLoadingApps.set(false);
      this.selectedAppControl.enable();
      if (app?.length == 1) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { app: app[0] },
        });
      }
    }),
    shareReplay(),
  );

  // Inline agent picker state
  isAgentPickerOpen = false; // legacy dropdown state
  agentFilterText: string = '';
  activeAgentIndex: number = 0;
  isAgentPanelOpen = false;

  // Import session
  importSessionEnabledObs: Observable<boolean>;

  // Edit eval tool use
  isEditFunctionArgsEnabledObs: Observable<boolean>;

  // Session url
  isSessionUrlEnabledObs: Observable<boolean>;

  // Trace detail
  bottomPanelVisible = false;
  hoveredEventMessageIndices: number[] = [];
  // Vertical sidebar tab selection
  selectedSideTab: string = 'trace';
  // Deep-dive overlay state
  isDeepDiveOpen = false;
  deepDiveMode: 'trace' | 'event' | null = null;
  deepDiveTraceId: string | null = null;
  deepDiveInvocId: string | null = null;

  constructor(
      private sanitizer: DomSanitizer,
      @Inject(SESSION_SERVICE) private sessionService: SessionService,
      @Inject(ARTIFACT_SERVICE) private artifactService: ArtifactService,
      private chatArtifactService: ChatArtifactService,
      private chatOauthService: ChatOauthService,
      private chatRoutingService: ChatRoutingService,
      @Inject(AUDIO_SERVICE) private audioService: AudioService,
      @Inject(WEBSOCKET_SERVICE) private webSocketService: WebSocketService,
      @Inject(VIDEO_SERVICE) private videoService: VideoService,
      private dialog: MatDialog,
      @Inject(EVENT_SERVICE) private eventService: EventService,
      private chatEventService: ChatEventService,
      private chatEvalService: ChatEvalService,
      private chatSessionViewService: ChatSessionViewService,
      private route: ActivatedRoute,
      @Inject(DOWNLOAD_SERVICE) private downloadService: DownloadService,
      @Inject(EVAL_SERVICE) private evalService: EvalService,
      @Inject(TRACE_SERVICE) private traceService: TraceService,
      private location: Location,
      private renderer: Renderer2,
      @Inject(DOCUMENT) private document: Document,
      @Inject(AGENT_SERVICE) private agentService: AgentService,
      @Inject(FEATURE_FLAG_SERVICE) private featureFlagService: FeatureFlagService,
      private chatRecordingService: ChatRecordingService,
      private chatSessionService: ChatSessionService,
      private chatStreamService: ChatStreamService,
  ) {
    this.importSessionEnabledObs =
        this.featureFlagService.isImportSessionEnabled();
    this.isEditFunctionArgsEnabledObs =
        this.featureFlagService.isEditFunctionArgsEnabled();
    this.isSessionUrlEnabledObs = this.featureFlagService.isSessionUrlEnabled();
  }

  ngOnInit(): void {
    this.syncSelectedAppFromUrl();
    this.updateSelectedAppUrl();

    this.webSocketService.onCloseReason().subscribe((closeReason) => {
      const error =
        'Please check server log for full details: \n' + closeReason;
      this.openSnackBar(error, 'OK');
    });

    // OAuth HACK: Opens oauth poup in a new window. If the oauth callback
    // is successful, the new window acquires the auth token, state and
    // optionally the scope. Send this back to the main window.
    const location = new URL(window.location.href);
    const searchParams = location.searchParams;
    if (searchParams.has('code')) {
      const authResponseUrl = window.location.href;
      // Send token to the main window
      window.opener?.postMessage({ authResponseUrl }, window.origin);
      // Close the popup
      window.close();
    }

    this.agentService.getApp().subscribe((app) => {
      this.appName = app;
    });

    combineLatest([
      this.agentService.getLoadingState(), toObservable(this.store.isModelThinking)
    ]).subscribe(([isLoading, isModelThinking]) => {
      const lastMessage = this.messages[this.messages.length - 1];

      if (isLoading) {
        if (!lastMessage?.isLoading && !this.streamingTextMessage) {
          this.messages.push({ role: 'bot', isLoading: true });
          this.store.setMessages(this.messages);
        }
      } else if (lastMessage?.isLoading && !isModelThinking) {
        this.messages.pop();
        this.store.setMessages(this.messages);
        this.changeDetectorRef.detectChanges();
      }
    });

    combineLatest([
      toObservable(this.store.messages), toObservable(this.store.scrollInterrupted),
      toObservable(this.store.streamingTextMessage)
    ]).subscribe(([messages, scrollInterrupted, streamingTextMessage]) => {
      if (!scrollInterrupted) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      }
    });

    this.traceService.selectedTraceRow$.subscribe(node => {
      const eventId = node?.attributes['gcp.vertex.agent.event_id']
      if (eventId && this.eventData.has(eventId)) {
        this.bottomPanelVisible = true;
      } else {
        this.bottomPanelVisible = false;
      }
    })

    this.traceService.hoveredMessageIndicies$.subscribe(i => this.hoveredEventMessageIndices = i);
  }

  ngAfterViewInit() {
    this.showSidePanel = true;
    this.sideDrawer.open();
  }

  // Custom inline agent picker helpers
  toggleAgentPicker() {
    this.isAgentPickerOpen = !this.isAgentPickerOpen;
    if (this.isAgentPickerOpen) {
      this.activeAgentIndex = 0;
    }
  }

  toggleAgentPanel() {
    this.isAgentPanelOpen = !this.isAgentPanelOpen;
    if (this.isAgentPanelOpen) {
      this.activeAgentIndex = 0;
    }
  }

  selectAgentFromPicker(appName: string) {
    this.selectedAppControl.setValue(appName);
    this.toggleAgentPicker();
  }

  filterApps(apps: string[] | undefined): string[] {
    const term = (this.agentFilterText || '').toLowerCase();
    if (!apps) return [];
    if (!term) return apps;
    return apps.filter(a => a.toLowerCase().includes(term));
  }

  // Keyboard navigation for agent picker
  onAgentFilterKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeAgentIndex += 1;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeAgentIndex -= 1;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.pickActiveAgent();
    } else if (event.key === 'Escape') {
      this.isAgentPickerOpen = false;
    }
    this.clampActiveIndex();
  }

  onAgentListKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === 'Escape') {
      this.onAgentFilterKeydown(event);
    }
  }

  private clampActiveIndex() {
    const sub = this.apps$.subscribe(apps => {
      const list = this.filterApps(apps ?? []);
      if (list.length === 0) { this.activeAgentIndex = 0; return; }
      if (this.activeAgentIndex < 0) this.activeAgentIndex = list.length - 1;
      if (this.activeAgentIndex >= list.length) this.activeAgentIndex = 0;
    });
    sub.unsubscribe();
  }

  private pickActiveAgent() {
    const sub = this.apps$.subscribe(apps => {
      const list = this.filterApps(apps ?? []);
      const candidate = list[this.activeAgentIndex];
      if (candidate) {
        this.selectAgentFromPicker(candidate);
      }
    });
    sub.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Close when clicking outside the agent picker container
    if (!target.closest('.agent-panel') && !target.closest('.agent-picker')) {
      this.isAgentPickerOpen = false;
      this.isAgentPanelOpen = false;
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      this.scrollContainer.nativeElement.scrollTo({
        top: this.scrollContainer.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    });
  }

  selectApp(appName: string) {
    if (appName != this.appName) {
      this.agentService.setApp(appName);

      this.isSessionUrlEnabledObs.subscribe((sessionUrlEnabled) => {
        const sessionUrl = this.activatedRoute.snapshot.queryParams['session'];

        if (!sessionUrlEnabled || !sessionUrl) {
          this.createSessionAndReset();

          return;
        }

        if (sessionUrl) {
          this.sessionService.getSession(this.userId, this.appName, sessionUrl)
              .pipe(take(1), catchError((error) => {
                      this.openSnackBar(
                          'Cannot find specified session. Creating a new one.',
                          'OK');
                      this.createSessionAndReset();
                      return of(null);
                    }))
              .subscribe((session) => {
                if (session) {
                  this.updateWithSelectedSession(session);
                }
              });
        }
      });
    }
  }

  private createSessionAndReset() {
    this.createSession();
    this.eventData = new Map<string, any>();
    this.eventMessageIndexArray = [];
    this.messages = [];
    this.artifacts = [];
    this.userInput = '';
    this.longRunningEvents = [];
  }

  createSession() {
    this.sessionService.createSession(this.userId, this.appName)
      .subscribe((res) => {
        this.currentSessionState = res.state;
        this.sessionId = res.id;
        this.sessionTab.refreshSession();

        this.isSessionUrlEnabledObs.subscribe((enabled) => {
          if (enabled) {
            this.updateSelectedSessionUrl();
          }
        });
      });
  }

  async sendMessage(event: Event) {
    if (this.usageGate.isLimited() && !this.usageGateDismissed) {
      this.openSnackBar('Free limit reached. Please upgrade to continue.', 'OK');
      return;
    }
    // Count a try when user sends a message
    this.usageGate.increment();
    await this.chatStreamService.sendMessage(this, event);
  }

  private processErrorMessage(chunkJson: any, index: number) {
    this.chatStreamService.processErrorMessage(this, chunkJson, index);
  }

  private processPart(chunkJson: any, part: any, index: number) {
    this.chatStreamService.processPart(this, chunkJson, part, index, this.useSse);
  }

  openTraceDeepDive(payload: { traceId: string, invocId: string }) {
    this.deepDiveMode = 'trace';
    this.deepDiveTraceId = payload.traceId;
    this.deepDiveInvocId = payload.invocId;
    // Try to find an eventId associated with this invocation to seed TraceEvent view
    try {
      const entries = Array.from(this.eventData.entries());
      const match = entries.find(([id, e]: any[]) => e && e.invocationId === payload.invocId);
      if (match) {
        const eventId = match[0];
        // Minimal span object with required attribute for TraceEvent component
        this.traceService.selectedRow({ attributes: { 'gcp.vertex.agent.event_id': eventId } } as any);
      }
      this.traceService.setEventData(this.eventData);
      this.traceService.setMessages(this.messages);
    } catch {}
    this.isDeepDiveOpen = true;
  }

  openEventDeepDive(eventId: string) {
    this.deepDiveMode = 'event';
    this.selectedEvent = this.eventData.get(eventId);
    this.selectedEventIndex = this.chatEventService.getIndexOfKeyInMap(this.eventData, eventId);
    this.isDeepDiveOpen = true;
  }

  closeDeepDive() {
    this.isDeepDiveOpen = false;
    this.deepDiveMode = null;
    this.deepDiveTraceId = null;
    this.deepDiveInvocId = null;
  }

  private storeMessage(
      part: any, e: any, index: number, role: string, invocationIndex?: number,
      additionalIndeces?: any) {
    if (e?.author) {
      this.createAgentIconColorClass(e.author);
    }

    if (e?.longRunningToolIds && e.longRunningToolIds.length > 0) {
      this.getAsyncFunctionsFromParts(e.longRunningToolIds, e.content.parts);
      const func = this.longRunningEvents[0];
      if (func.args.authConfig &&
        func.args.authConfig.exchangedAuthCredential &&
        func.args.authConfig.exchangedAuthCredential.oauth2) {
        // for OAuth
        const authUri =
          func.args.authConfig.exchangedAuthCredential.oauth2.authUri;
        const updatedAuthUri = updateRedirectUri(
          authUri,
          this.redirectUri,
        );
        this.chatOauthService.openOAuthPopup(updatedAuthUri)
          .then((authResponseUrl) => {
            this.functionCallEventId = e.id;
            this.chatOauthService
              .sendOAuthResponse(
                func,
                authResponseUrl,
                this.redirectUri,
                this.appName,
                this.userId,
                this.sessionId,
                this.functionCallEventId,
              )
              .subscribe((response) => {
                this.longRunningEvents.pop();
                this.processRunSseResponse(response);
              });
          })
          .catch((error) => {
            console.error('OAuth Error:', error);
          });
      } else {
        this.functionCallEventId = e.id;
      }
    }
    if (e?.actions && e.actions.artifactDelta) {
      for (const key in e.actions.artifactDelta) {
        if (e.actions.artifactDelta.hasOwnProperty(key)) {
          this.renderArtifact(key, e.actions.artifactDelta[key]);
        }
      }
    }

    if (e?.evalStatus) {
      this.isChatMode.set(false);
    }

    let message: any = {
      role,
      evalStatus: e?.evalStatus,
      failedMetric: e?.failedMetric,
      evalScore: e?.evalScore,
      evalThreshold: e?.evalThreshold,
      actualInvocationToolUses: e?.actualInvocationToolUses,
      expectedInvocationToolUses: e?.expectedInvocationToolUses,
      actualFinalResponse: e?.actualFinalResponse,
      expectedFinalResponse: e?.expectedFinalResponse,
      invocationIndex: invocationIndex !== undefined ? invocationIndex :
                                                       undefined,
      finalResponsePartIndex:
          additionalIndeces?.finalResponsePartIndex !== undefined ?
          additionalIndeces.finalResponsePartIndex :
          undefined,
      toolUseIndex: additionalIndeces?.toolUseIndex !== undefined ?
          additionalIndeces.toolUseIndex :
          undefined,
    };
    if (part.inlineData) {
      const base64Data =
        formatBase64Data(part.inlineData.data, part.inlineData.mimeType);
      message.inlineData = {
        displayName: part.inlineData.displayName,
        data: base64Data,
        mimeType: part.inlineData.mimeType,
      };
      this.eventMessageIndexArray[index] = part.inlineData;
    } else if (part.text) {
      message.text = part.text;
      message.thought = part.thought ? true : false;
      if (e?.groundingMetadata && e.groundingMetadata.searchEntryPoint &&
        e.groundingMetadata.searchEntryPoint.renderedContent) {
        message.renderedContent =
          e.groundingMetadata.searchEntryPoint.renderedContent;
      }
      message.eventId = e?.id;
      this.eventMessageIndexArray[index] = part.text;
    } else if (part.functionCall) {
      message.functionCall = part.functionCall;
      message.eventId = e?.id;
      this.eventMessageIndexArray[index] = part.functionCall;
    } else if (part.functionResponse) {
      message.functionResponse = part.functionResponse;
      message.eventId = e?.id;
      this.eventMessageIndexArray[index] = part.functionResponse;
    } else if (part.executableCode) {
      message.executableCode = part.executableCode;
      this.eventMessageIndexArray[index] = part.executableCode;
    } else if (part.codeExecutionResult) {
      message.codeExecutionResult = part.codeExecutionResult;
      this.eventMessageIndexArray[index] = part.codeExecutionResult;
      if (e.actions && e.actions.artifact_delta) {
        for (const key in e.actions.artifact_delta) {
          if (e.actions.artifact_delta.hasOwnProperty(key)) {
            this.renderArtifact(key, e.actions.artifact_delta[key]);
          }
        }
      }
    }

    if (Object.keys(part).length > 0) {
      this.insertMessageBeforeLoadingMessage(message);
    }
  }

  private insertMessageBeforeLoadingMessage(message: any) {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage?.isLoading) {
      this.messages.splice(this.messages.length - 1, 0, message);
    } else {
      this.messages.push(message);
    }
    this.store.setMessages(this.messages);
  }

  private renderArtifact(artifactId: string, versionId: string) {
    this.chatStreamService['renderArtifact'](this, artifactId, versionId);
  }

  private storeEvents(part: any, e: any, index: number) {
    this.chatStreamService.storeEvents(this, part, e, index);
  }

  

  private processRunSseResponse(response: any) {
    let index = this.eventMessageIndexArray.length - 1;
    for (const e of response) {
      if (e.content) {
        for (let part of e.content.parts) {
          index += 1;
          this.processPart(e, part, index);
        }
      }
    }
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(PendingEventDialogComponent, {
      width: '600px',
      data: {
        event: this.longRunningEvents[0],
        appName: this.appName,
        userId: this.userId,
        sessionId: this.sessionId,
        functionCallEventId: this.functionCallEventId,
      },
    });

    dialogRef.afterClosed().subscribe((t) => {
      if (t) {
        this.removeFinishedLongRunningEvents(t.events);
        this.processRunSseResponse(t.response);
      }
    });
  }

  removeFinishedLongRunningEvents(finishedEvents: any[]) {
    const idsToExclude = new Set(finishedEvents.map((obj: any) => obj.id));
    this.longRunningEvents =
      this.longRunningEvents.filter(obj => !idsToExclude.has(obj.id));
  }

  getAgentNameFromEvent(i: number) {
    const key = this.messages[i].eventId;
    if (!key) { return ROOT_AGENT; }
    const selectedEvent = this.eventData.get(key);

    return selectedEvent?.author ?? ROOT_AGENT;
  }

  customIconColorClass(i: number) {
    const agentName = this.getAgentNameFromEvent(i);
    return agentName !== ROOT_AGENT ?
        `custom-icon-color-${stc(agentName ?? ROOT_AGENT).replace('#', '')}` :
        '';
  }

  createAgentIconColorClass(agentName: string) {
    const agentIconColor = stc(agentName ?? ROOT_AGENT);

    const agentIconColorClass =
        `custom-icon-color-${agentIconColor.replace('#', '')}`;

    // Inject the style for this unique class
    this.injectCustomIconColorStyle(agentIconColorClass, agentIconColor);
  }

  clickEvent(i: number) {
    const key = this.messages[i].eventId;
    if (!key) { return; }

    this.sideDrawer.open();
    this.showSidePanel = true;
    this.selectedEvent = this.eventData.get(key);
    this.selectedEventIndex = this.chatEventService.getIndexOfKeyInMap(this.eventData, key);
    
    if (!this.selectedEvent?.id) { return; }
    this.chatEventService
      .loadEventDetails(
        this.userId,
        this.appName,
        this.sessionId,
        this.selectedEvent.id,
        this.llmRequestKey,
        this.llmResponseKey,
      )
      .subscribe(({ llmRequest, llmResponse, renderedEventGraph, rawSvgString }) => {
        this.llmRequest = llmRequest;
        this.llmResponse = llmResponse;
        this.renderedEventGraph = renderedEventGraph;
        this.rawSvgString = rawSvgString ?? null;
      });
  }

  userMessagesLength(i: number) {
    return this.messages.slice(0, i).filter((m) => m.role == 'user').length;
  }

  ngOnDestroy(): void {
    this.webSocketService.closeConnection();
  }

  onAppSelection(event: any) {
    if (this.isAudioRecording) {
      this.stopAudioRecording();
      this.isAudioRecording = false;
    }
    if (this.isVideoRecording) {
      this.stopVideoRecording();
      this.isVideoRecording = false;
    }
    this.evalTab?.resetEvalResults();
    this.traceData = [];
    this.bottomPanelVisible = false;
  }

  toggleAudioRecording() {
    this.isAudioRecording ? this.stopAudioRecording() :
      this.startAudioRecording();
  }

  startAudioRecording() {
    this.chatRecordingService.startAudioRecording(this);
  }

  stopAudioRecording() {
    this.chatRecordingService.stopAudioRecording(this);
  }

  toggleVideoRecording() {
    this.isVideoRecording ? this.stopVideoRecording() :
      this.startVideoRecording();
  }

  startVideoRecording() {
    this.chatRecordingService.startVideoRecording(this);
  }

  stopVideoRecording() {
    this.chatRecordingService.stopVideoRecording(this);
  }

  private getAsyncFunctionsFromParts(pendingIds: any[], parts: any[]) {
    for (const part of parts) {
      if (part.functionCall && pendingIds.includes(part.functionCall.id)) {
        this.longRunningEvents.push(part.functionCall);
      }
    }
  }

  

  toggleSidePanel() {
    if (this.showSidePanel) {
      this.sideDrawer.close();
    } else {
      this.sideDrawer.open();
    }
    this.showSidePanel = !this.showSidePanel;
  }

  selectSideTab(tab: string) {
    this.selectedSideTab = tab;
    this.handleTabChange(null);
  }

  

  protected handleTabChange(event: any) {
    if (!this.isChatMode()) {
      this.resetEditEvalCaseVars();
      this.handleReturnToSession(true);
    }
  }

  protected handleShouldShowEvalTab(shouldShow: boolean) {
    this.shouldShowEvalTab.set(shouldShow);
  }

  protected handleReturnToSession(event: boolean) {
    this.sessionTab.getSession(this.sessionId);
    this.evalTab.resetEvalCase();
    this.isChatMode.set(true);
  }

  protected handleEvalNotInstalled(errorMsg: string) {
    if (errorMsg) {
      this.openSnackBar(errorMsg, 'OK');
    }
  }

  private resetEventsAndMessages() {
    this.chatSessionViewService.resetEventsAndMessages(this);
  }

  protected updateWithSelectedSession(session: Session) {
    this.chatSessionViewService.updateWithSelectedSession(this, session);
  }

  protected updateWithSelectedEvalCase(evalCase: EvalCase) {
    this.chatEvalService.updateWithSelectedEvalCase(this, evalCase);
  }

  protected updateSelectedEvalSetId(evalSetId: string) {
    this.evalSetId = evalSetId;
  }

  protected editEvalCaseMessage(message: any) {
    this.chatEvalService.editEvalCaseMessage(this, message);
  }

  protected editFunctionArgs(message: any) {
    this.isEvalCaseEditing.set(true);
    const dialogRef = this.dialog.open(EditJsonDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        dialogHeader: 'Edit function arguments',
        functionName: message.functionCall.name,
        jsonContent: message.functionCall.args
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.isEvalCaseEditing.set(false);
      if (result) {
        this.hasEvalCaseChanged.set(true);
        message.functionCall.args = result;

        this.updatedEvalCase = structuredClone(this.evalCase!);
        this.updatedEvalCase!.conversation[message.invocationIndex]
            .intermediateData!.toolUses![message.toolUseIndex]
            .args = result;
      }
    });
  }

  protected saveEvalCase() {
    this.chatEvalService.saveEvalCase(this);
  }

  protected cancelEditEvalCase() {
    this.chatEvalService.cancelEditEvalCase(this);
  }

  private resetEditEvalCaseVars() { this.chatEvalService.resetEditEvalCaseVars(this); }

  protected cancelEditMessage(message: any) {
    message.isEditing = false;
    this.isEvalCaseEditing.set(false);
  }

  protected saveEditMessage(message: any) {
    this.chatEvalService.saveEditMessage(this, message);
  }

  protected handleKeydown(event: KeyboardEvent, message: any) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditMessage(message);
    } else if (event.key === 'Escape') {
      this.cancelEditMessage(message);
    }
  }

  protected deleteEvalCaseMessage(message: any, index: number) {
    this.chatEvalService.deleteEvalCaseMessage(this, message, index);
  }

  protected editEvalCase() {
    this.isEvalEditMode.set(true);
  }

  protected deleteEvalCase() {
    const dialogData: DeleteSessionDialogData = {
      title: 'Confirm delete',
      message: `Are you sure you want to delete ${this.evalCase!.evalId}?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
      width: '600px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.evalTab.deleteEvalCase(this.evalCase!.evalId);
        this.openSnackBar('Eval case deleted', 'OK')
      }
    });
  }

  protected updateSessionState(session: Session) {
    this.currentSessionState = session.state;
  }

  onNewSessionClick() {
    this.createSession();
    this.eventData.clear();
    this.eventMessageIndexArray = [];
    this.messages = [];
    this.artifacts = [];
    this.traceData = [];
    this.bottomPanelVisible = false;

    // Close eval history if opened
    if (!!this.evalTab.showEvalHistory) {
      this.evalTab.toggleEvalHistoryButton();
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const url = URL.createObjectURL(file);
        this.selectedFiles.push({ file, url });
      }
    }
    input.value = '';
  }

  removeFile(index: number) {
    URL.revokeObjectURL(this.selectedFiles[index].url);
    this.selectedFiles.splice(index, 1);
  }

  toggleSse() {
    this.useSse = !this.useSse;
  }

  selectEvent(key: string) {
    this.selectedEvent = this.eventData.get(key);
    this.selectedEventIndex = this.chatEventService.getIndexOfKeyInMap(this.eventData, key);
    if (!this.selectedEvent?.id) { return; }
    this.chatEventService
      .loadEventDetails(
        this.userId,
        this.appName,
        this.sessionId,
        this.selectedEvent.id,
        this.llmRequestKey,
        this.llmResponseKey,
      )
      .subscribe(({ llmRequest, llmResponse, renderedEventGraph, rawSvgString }) => {
        this.llmRequest = llmRequest;
        this.llmResponse = llmResponse;
        this.renderedEventGraph = renderedEventGraph;
        this.rawSvgString = rawSvgString ?? null;
      });
  }

  protected deleteSession(session: string) {
    const dialogData: DeleteSessionDialogData = {
      title: 'Confirm delete',
      message:
        `Are you sure you want to delete this session ${this.sessionId}?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    };

    const dialogRef = this.dialog.open(DeleteSessionDialogComponent, {
      width: '600px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.sessionService.deleteSession(this.userId, this.appName, session)
          .subscribe((res) => {
            const nextSession = this.sessionTab.refreshSession(session);
            if (nextSession) {
              this.sessionTab.getSession(nextSession.id);
            } else {
              window.location.reload();
            }
          });
      } else {
      }
    });
  }

  private syncSelectedAppFromUrl() {
    this.chatRoutingService
      .syncSelectedAppFromUrl$(this.apps$)
      .subscribe((app) => {
        if (app) {
          this.selectedAppControl.setValue(app);
        }
      });
  }

  private updateSelectedAppUrl() {
    this.selectedAppControl.valueChanges
      .pipe(distinctUntilChanged(), filter(Boolean))
      .subscribe((app: string) => {
        this.selectApp(app);

        // Navigate if selected app changed.
        const selectedAgent = this.activatedRoute.snapshot.queryParams['app'];
        if (app === selectedAgent) {
          return;
        }
        this.chatRoutingService.navigateWithSelectedApp(app);
      });
  }

  private updateSelectedSessionUrl() {
    this.chatRoutingService.updateSelectedSessionUrl(this.sessionId);
  }

  handlePageEvent(event: any) {
    if (event.pageIndex >= 0) {
      const key = this.chatEventService.getKeyAtIndexInMap(this.eventData, event.pageIndex);
      if (key) {
        this.selectEvent(key);
      }
    }
  }

  closeSelectedEvent() {
    this.selectedEvent = undefined;
    this.selectedEventIndex = undefined;
  }

  

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action);
  }

  

  openLink(url: string) {
    window.open(url, '_blank');
  }

  renderGooglerSearch(content: string) {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  openViewImageDialog(imageData: string | null) {
    const dialogRef = this.dialog.open(ViewImageDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        imageData,
      },
    });
  }

  private createDefaultArtifactName(mimeType: string): string {
    if (!mimeType || !mimeType.includes('/')) {
      return '';
    }

    return mimeType.replace('/', '.');
  }

  protected exportSession() {
    this.chatSessionService.exportSession(this.userId, this.appName, this.sessionId);
  }

  protected updateState() {
    const dialogRef = this.dialog.open(EditJsonDialogComponent, {
      maxWidth: '90vw',
      maxHeight: '90vh',
      data:
          {dialogHeader: 'Update state', jsonContent: this.currentSessionState},
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.updatedSessionState.set(result);
      }
    });
  }

  protected removeStateUpdate() {
    this.updatedSessionState.set(null);
  }

  closeTraceEventDetailPanel() {
    this.bottomPanelVisible = false;
    this.traceService.selectedRow(undefined);
    this.traceService.setHoveredMessages(undefined, "")
  }

  shouldMessageHighlighted(index: number) {
    return this.hoveredEventMessageIndices.includes(index);
  }

  protected importSession() {
    this.chatSessionService.importSessionFromFile(this);
  }

  
  // Helper method to dynamically inject the style
  private injectCustomIconColorStyle(className: string, color: string): void {
    // Check if the style already exists to prevent duplicates
    if (this.document.getElementById(className)) {
      return;
    }

    const style = this.renderer.createElement('style');
    this.renderer.setAttribute(
        style, 'id', className);  // Set an ID to check for existence later
    this.renderer.setAttribute(style, 'type', 'text/css');

    // Define the CSS
    const css = `
      .${className} {
        background-color: ${color} !important;
      }
    `;

    this.renderer.appendChild(style, this.renderer.createText(css));
    this.renderer.appendChild(
        this.document.head, style);  // Append to the head of the document
  }
}
