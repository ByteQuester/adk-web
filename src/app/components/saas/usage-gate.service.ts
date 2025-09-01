/**
 * @license
 * Copyright 2025 Google LLC
 */
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UsageGateService {
  private static readonly KEY = 'adk-usage-count';
  private static readonly LIMIT = 5;

  get count(): number {
    return Number(localStorage.getItem(UsageGateService.KEY) || '0');
  }

  get remaining(): number {
    return Math.max(0, UsageGateService.LIMIT - this.count);
  }

  increment(): void {
    const next = Math.min(UsageGateService.LIMIT, this.count + 1);
    localStorage.setItem(UsageGateService.KEY, String(next));
  }

  isLimited(): boolean {
    return this.count >= UsageGateService.LIMIT;
  }
}



