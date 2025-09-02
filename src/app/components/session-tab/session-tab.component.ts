/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Component, EventEmitter, Input, OnInit, Output, Inject} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Subject, switchMap} from 'rxjs';
import {Session} from '../../core/models/Session';
import {SessionService, SESSION_SERVICE} from '../../core/services/session.service';

@Component({
  selector: 'app-session-tab',
  templateUrl: './session-tab.component.html',
  styleUrl: './session-tab.component.scss',
  standalone: false,
})
export class SessionTabComponent implements OnInit {
  @Input() userId: string = '';
  @Input() appName: string = '';
  @Input() sessionId: string = '';

  @Output() readonly sessionSelected = new EventEmitter<Session>();
  @Output() readonly sessionReloaded = new EventEmitter<Session>();

  sessionList: any[] = [];
  private sessionTitleCache: Record<string, string> = {};
  private sessionTitlePending = new Set<string>();

  private refreshSessionsSubject = new Subject<void>();

  constructor(
    @Inject(SESSION_SERVICE) private sessionService: SessionService,
    private dialog: MatDialog,
  ) {
    this.refreshSessionsSubject
        .pipe(
            switchMap(
                () =>
                    this.sessionService.listSessions(this.userId, this.appName),
                ),
            )
        .subscribe((res) => {
          res = res.sort(
              (a: any, b: any) =>
                  Number(b.lastUpdateTime) - Number(a.lastUpdateTime),
          );
          this.sessionList = res;
          // Try to hydrate titles from localStorage, compute when missing
          for (const s of this.sessionList) {
            this.hydrateTitleFromStorage(s);
          }
        });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.refreshSessionsSubject.next();
    }, 500);
  }

  getSession(sessionId: string) {
    this.sessionService
      .getSession(this.userId, this.appName, sessionId)
      .subscribe((res) => {
        const session = this.fromApiResultToSession(res);
        this.sessionSelected.emit(session);
      });
  }

  protected getDate(session: any): string {
    let timeStamp = session.lastUpdateTime;

    const date = new Date(timeStamp * 1000);

    return date.toLocaleString();
  }


  private fromApiResultToSession(res: any): Session {
    return {
      id: res?.id ?? '',
      appName: res?.appName ?? '',
      userId: res?.userId ?? '',
      state: res?.state ?? [],
      events: res?.events ?? [],
    };
  }

  reloadSession(sessionId: string) {
    this.sessionService
      .getSession(this.userId, this.appName, sessionId)
      .subscribe((res) => {
        const session = this.fromApiResultToSession(res);
        this.sessionReloaded.emit(session);
      });
  }

  refreshSession(session?: string) {
    this.refreshSessionsSubject.next();
    if (this.sessionList.length <= 1) {
      return undefined;
    } else {
      let index = this.sessionList.findIndex((s) => s.id == session);
      if (index == this.sessionList.length - 1) {
        index = -1;
      }
      return this.sessionList[index + 1];
    }
  }

  protected getSessionTitle(session: any): string | undefined {
    const key = this.titleCacheKey(session);
    if (this.sessionTitleCache[key]) {
      return this.sessionTitleCache[key];
    }
    // Try storage once
    const stored = this.readTitleFromStorage(key);
    if (stored) {
      this.sessionTitleCache[key] = stored;
      return stored;
    }
    // Fetch asynchronously if not already
    if (!this.sessionTitlePending.has(key)) {
      this.sessionTitlePending.add(key);
      this.sessionService
          .getSession(this.userId, this.appName, session.id)
          .subscribe((res) => {
            const title = this.computeTitleFromSession(res);
            if (title) {
              this.sessionTitleCache[key] = title;
              this.writeTitleToStorage(key, title);
            }
            this.sessionTitlePending.delete(key);
          }, () => {
            this.sessionTitlePending.delete(key);
          });
    }
    return undefined;
  }

  private computeTitleFromSession(res: any): string | undefined {
    try {
      const events = res?.events ?? [];
      for (const e of events) {
        if (e?.author === 'user') {
          const parts = e?.content?.parts ?? [];
          for (const p of parts) {
            const text = (p?.text || '').toString();
            if (text && text.trim()) {
              const clean = text.replace(/\s+/g, ' ').trim();
              return this.truncateWords(clean, 7);
            }
          }
        }
      }
    } catch {}
    return undefined;
  }

  private truncateWords(text: string, maxWords: number): string {
    const words = text.split(' ');
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '…';
  }

  private titleCacheKey(session: any): string {
    return `adk.session.title.${this.appName}.${session.id}.${session.lastUpdateTime}`;
  }

  private hydrateTitleFromStorage(session: any) {
    const key = this.titleCacheKey(session);
    const stored = this.readTitleFromStorage(key);
    if (stored) {
      this.sessionTitleCache[key] = stored;
    }
  }

  private readTitleFromStorage(key: string): string | undefined {
    try {
      const v = localStorage.getItem(key);
      return v || undefined;
    } catch { return undefined; }
  }

  private writeTitleToStorage(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }
}
