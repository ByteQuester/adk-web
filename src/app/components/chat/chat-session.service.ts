import { Inject, Injectable } from '@angular/core';
import { DOWNLOAD_SERVICE, DownloadService } from '../../core/services/download.service';
import { SESSION_SERVICE, SessionService } from '../../core/services/session.service';
import { AgentRunRequest } from '../../core/models/AgentRunRequest';

@Injectable({ providedIn: 'root' })
export class ChatSessionService {
  constructor(
    @Inject(SESSION_SERVICE) private sessionService: SessionService,
    @Inject(DOWNLOAD_SERVICE) private downloadService: DownloadService,
  ) {}

  exportSession(userId: string, appName: string, sessionId: string) {
    this.sessionService.getSession(userId, appName, sessionId).subscribe((res) => {
      this.downloadService.downloadObjectAsJson(res, `session-${sessionId}.json`);
    });
  }

  importSessionFromFile(ctx: any) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      if (!input.files || input.files.length === 0) { return; }
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          try {
            const sessionData = JSON.parse(e.target.result as string);
            if (!sessionData.userId || !sessionData.appName || !sessionData.events) {
              ctx.openSnackBar('Invalid session file format', 'OK');
              return;
            }
            this.sessionService
              .importSession(sessionData.userId, sessionData.appName, sessionData.events)
              .subscribe(() => {
                ctx.openSnackBar('Session imported', 'OK');
                ctx.sessionTab.refreshSession();
              });
          } catch (_) {
            ctx.openSnackBar('Error parsing session file', 'OK');
          }
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}



