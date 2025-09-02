import { Inject, Injectable } from '@angular/core';
import { AgentRunRequest } from '../../../core/models/AgentRunRequest';
import { AgentService, AGENT_SERVICE } from '../../../core/services/agent.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatOauthService {
  constructor(@Inject(AGENT_SERVICE) private agentService: AgentService) {}

  openOAuthPopup(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const popup = window.open(url, 'oauthPopup', 'width=600,height=700');
      if (!popup) {
        reject('Popup blocked!');
        return;
      }
      const listener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        const { authResponseUrl } = event.data as { authResponseUrl?: string };
        if (authResponseUrl) {
          resolve(authResponseUrl);
          window.removeEventListener('message', listener);
        }
      };
      window.addEventListener('message', listener);
    });
  }

  sendOAuthResponse(
    func: any,
    authResponseUrl: string,
    redirectUri: string,
    appName: string,
    userId: string,
    sessionId: string,
    functionCallEventId: string,
  ): Observable<any[]> {
    const authResponse: AgentRunRequest = {
      appName,
      userId,
      sessionId,
      newMessage: {
        role: 'user',
        parts: [],
      },
    };

    const authConfig = structuredClone(func.args.authConfig);
    authConfig.exchangedAuthCredential.oauth2.authResponseUri = authResponseUrl;
    authConfig.exchangedAuthCredential.oauth2.redirectUri = redirectUri;

    authResponse.functionCallEventId = functionCallEventId;
    authResponse.newMessage.parts.push({
      function_response: {
        id: func.id,
        name: func.name,
        response: authConfig,
      },
    } as any);

    return new Observable<any[]>((subscriber) => {
      const response: any[] = [];
      const sub = this.agentService.runSse(authResponse).subscribe({
        next: (chunk: string) => {
          try {
            const json = JSON.parse(chunk);
            response.push(json);
          } catch (_) {}
        },
        error: (err) => subscriber.error(err),
        complete: () => {
          subscriber.next(response);
          subscriber.complete();
        },
      });
      return () => sub.unsubscribe();
    });
  }
}


