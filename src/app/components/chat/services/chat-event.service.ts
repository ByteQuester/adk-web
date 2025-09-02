import { Inject, Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EVENT_SERVICE, EventService } from '../../../core/services/event.service';
import { Observable, combineLatest, from, map, of, switchMap } from 'rxjs';
import { instance } from '@viz-js/viz';

@Injectable({ providedIn: 'root' })
export class ChatEventService {
  constructor(
    @Inject(EVENT_SERVICE) private eventService: EventService,
    private sanitizer: DomSanitizer,
  ) {}

  getIndexOfKeyInMap(eventData: Map<string, any>, key: string): number | undefined {
    let index = 0;
    const mapOrderPreservingSort = (a: any, b: any): number => 0;
    const sortedKeys = Array.from(eventData.keys()).sort(mapOrderPreservingSort);
    for (const k of sortedKeys) {
      if (k === key) {
        return index;
      }
      index++;
    }
    return undefined;
  }

  getKeyAtIndexInMap(eventData: Map<string, any>, index: number): string | undefined {
    const mapOrderPreservingSort = (a: any, b: any): number => 0;
    const sortedKeys = Array.from(eventData.keys()).sort(mapOrderPreservingSort);
    if (index >= 0 && index < sortedKeys.length) {
      return sortedKeys[index];
    }
    return undefined;
  }

  loadEventDetails(
    userId: string,
    appName: string,
    sessionId: string,
    eventId: string,
    llmRequestKey: string,
    llmResponseKey: string,
  ): Observable<{ llmRequest: any; llmResponse: any; renderedEventGraph?: SafeHtml; rawSvgString?: string }>
  {
    if (!eventId) {
      return of({ llmRequest: undefined, llmResponse: undefined });
    }

    const trace$ = this.eventService.getEventTrace(eventId).pipe(
      map((res: any) => ({
        llmRequest: JSON.parse(res[llmRequestKey]),
        llmResponse: JSON.parse(res[llmResponseKey]),
      })),
    );

    const graph$ = this.eventService
      .getEvent(userId, appName, sessionId, eventId)
      .pipe(
        switchMap(async (res: any) => {
          if (!res.dotSrc) {
            return { renderedEventGraph: undefined, rawSvgString: undefined };
          }
          const viz = await instance();
          const svg = await viz.renderString(res.dotSrc, { format: 'svg', engine: 'dot' });
          return {
            renderedEventGraph: this.sanitizer.bypassSecurityTrustHtml(svg),
            rawSvgString: svg as string,
          };
        }),
      );

    return combineLatest([trace$, graph$]).pipe(
      map(([t, g]: [any, any]) => ({ llmRequest: t.llmRequest, llmResponse: t.llmResponse, ...g })),
    );
  }
}


