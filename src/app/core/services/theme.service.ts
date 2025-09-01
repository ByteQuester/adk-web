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

import { Injectable, Signal, WritableSignal, computed, signal } from '@angular/core';

type ThemeName = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly STORAGE_KEY = 'adk-theme';
  private currentThemeSignal: WritableSignal<ThemeName> = signal(this.readInitialTheme());

  readonly currentTheme: Signal<ThemeName> = computed(() => this.currentThemeSignal());
  readonly isDark: Signal<boolean> = computed(() => this.currentThemeSignal() === 'dark');

  constructor() {
    this.applyTheme(this.currentThemeSignal());
  }

  toggle(): void {
    const next: ThemeName = this.currentThemeSignal() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme: ThemeName): void {
    this.currentThemeSignal.set(theme);
    localStorage.setItem(ThemeService.STORAGE_KEY, theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: ThemeName): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }

  private readInitialTheme(): ThemeName {
    const saved = localStorage.getItem(ThemeService.STORAGE_KEY) as ThemeName | null;
    if (saved === 'dark' || saved === 'light') return saved;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' as ThemeName : 'light' as ThemeName;
  }
}


