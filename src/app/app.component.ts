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

import {Component, EventEmitter, Output, computed, inject, signal} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: false,
})
export class AppComponent {
  private readonly theme = inject(ThemeService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  isDark = computed(() => this.theme.isDark());
  scrolled = false;
  isAnyDialogOpen = false;
  chatMainTab = signal<'chat'|'features'>('chat');
  @Output() toggleChatSidePanel = new EventEmitter<void>();

  isChatRoute() {
    const url = this.router.url || '';
    return url.startsWith('/chat');
  }

  setChatMainTab(tab: 'chat'|'features') {
    const current = this.chatMainTab();
    if (current === tab) return;
    this.chatMainTab.set(tab);
    const child = this.activatedRoute.firstChild;
    if (child) {
      this.router.navigate([], { queryParams: { mainTab: tab }, queryParamsHandling: 'merge', relativeTo: child });
    }
  }

  toggleTheme() {
    this.theme.toggle();
  }

  onThemeToggleKeydown(event: KeyboardEvent) {
    const code = event.key;
    if (code === 'Enter' || code === ' ' || code === 'Spacebar') {
      event.preventDefault();
      this.toggleTheme();
    }
  }

  

  onContentScroll(event: Event) {
    const target = event.target as HTMLElement | null;
    const offset = target ? target.scrollTop : window.scrollY;
    this.scrolled = offset > 4;
  }

  onToggleLeftPanel() {
    try {
      window.dispatchEvent(new Event('toggleChatSidePanel'));
    } catch {}
  }

  onSegmentedKeydown(event: KeyboardEvent) {
    const current = this.chatMainTab();
    if (event.key === 'ArrowLeft') {
      this.setChatMainTab('chat');
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.setChatMainTab('features');
      event.preventDefault();
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      this.setChatMainTab(current === 'chat' ? 'features' : 'chat');
      event.preventDefault();
    }
  }

  constructor() {
    this.dialog.afterOpened.subscribe(() => this.isAnyDialogOpen = true);
    this.dialog.afterAllClosed.subscribe(() => this.isAnyDialogOpen = false);
    // Also listen for overlay open/close events for menus via capturing clicks
    document.addEventListener('click', () => {
      // no-op; menu close will restore toolbar blur automatically
    });
    // Initialize from current route
    const initialChild = this.activatedRoute.firstChild;
    const initialTab = initialChild?.snapshot.queryParams['mainTab'];
    this.chatMainTab.set(initialTab === 'features' ? 'features' : 'chat');
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const child = this.activatedRoute.firstChild;
      const tab = child?.snapshot.queryParams['mainTab'];
      this.chatMainTab.set(tab === 'features' ? 'features' : 'chat');
    });
  }
}
