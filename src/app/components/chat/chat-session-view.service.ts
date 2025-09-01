import { Injectable } from '@angular/core';
import { Session } from '../../core/models/Session';

@Injectable({ providedIn: 'root' })
export class ChatSessionViewService {
  resetEventsAndMessages(ctx: any) {
    ctx.eventData.clear();
    ctx.eventMessageIndexArray = [];
    ctx.messages = [];
    ctx.messagesSubject.next(ctx.messages);
    ctx.artifacts = [];
  }

  updateWithSelectedSession(ctx: any, session: Session) {
    if (!session || !session.id || !session.events || !session.state) {
      return;
    }
    ctx.traceService.resetTraceService();
    ctx.sessionId = session.id;
    ctx.currentSessionState = session.state;
    ctx.evalCase = null;
    ctx.isChatMode.set(true);

    ctx.isSessionUrlEnabledObs.subscribe((enabled: boolean) => {
      if (enabled) {
        ctx.updateSelectedSessionUrl();
      }
    });

    this.resetEventsAndMessages(ctx);
    let index = 0;

    session.events.forEach((event: any) => {
      event.content?.parts?.forEach((part: any) => {
        ctx.storeMessage(part, event, index, event.author === 'user' ? 'user' : 'bot');
        index += 1;
        if (event.author && event.author !== 'user') {
          ctx.storeEvents(part, event, index);
        }
      });
    });

    ctx.eventService.getTrace(ctx.sessionId).subscribe((res: any) => {
      ctx.traceData = res;
      ctx.traceService.setEventData(ctx.eventData);
      ctx.traceService.setMessages(ctx.messages);
    });

    ctx.bottomPanelVisible = false;
  }
}


