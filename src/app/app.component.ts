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

import {Component, computed, inject} from '@angular/core';
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
  isDark = computed(() => this.theme.isDark());
  scrolled = false;
  isAnyDialogOpen = false;

  toggleTheme() {
    this.theme.toggle();
  }

  onContentScroll(event: Event) {
    const target = event.target as HTMLElement | null;
    const offset = target ? target.scrollTop : window.scrollY;
    this.scrolled = offset > 4;
  }

  constructor() {
    this.dialog.afterOpened.subscribe(() => this.isAnyDialogOpen = true);
    this.dialog.afterAllClosed.subscribe(() => this.isAnyDialogOpen = false);
    // Also listen for overlay open/close events for menus via capturing clicks
    document.addEventListener('click', () => {
      // no-op; menu close will restore toolbar blur automatically
    });
  }
}
