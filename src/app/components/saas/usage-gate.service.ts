import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService } from '../../core/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class UsageGateService {
  private static readonly LEGACY_COUNT_KEY = 'adk-usage-count';
  private static readonly LEGACY_LIMIT_KEY = 'adk-usage-limit';
  private static readonly NAMESPACE_PREFIX = 'adk-usage:v1';
  private static readonly DEVICE_ID_KEY = 'adk-device-id';
  private static readonly DEFAULT_LIMIT = 5;

  private readonly supabase = inject(SupabaseService);
  private static readonly REMOTE_TABLE = 'usage_quota';
  private currentSubjectId = this.computeSubjectId();
  private readonly countSubject = new BehaviorSubject<number>(
    this.readCountFor(this.currentSubjectId)
  );
  readonly count$ = this.countSubject.asObservable();

  get count(): number { return this.countSubject.value; }

  get limit(): number {
    const raw = localStorage.getItem(this.limitKey(this.currentSubjectId));
    const parsed = Number(raw ?? UsageGateService.DEFAULT_LIMIT);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : UsageGateService.DEFAULT_LIMIT;
  }

  get remaining(): number { return Math.max(0, this.limit - this.count); }

  increment(): void {
    const next = Math.min(this.limit, this.count + 1);
    this.writeCountFor(this.currentSubjectId, next);
    this.persistToRemoteIfUser({ count: next });
  }

  reset(): void {
    this.writeCountFor(this.currentSubjectId, 0);
    this.persistToRemoteIfUser({ count: 0 });
  }

  setLimit(limit: number): void {
    if (!Number.isFinite(limit) || limit <= 0) return;
    localStorage.setItem(this.limitKey(this.currentSubjectId), String(limit));
    if (this.count > limit) {
      this.writeCountFor(this.currentSubjectId, limit);
    } else {
      // Trigger subscribers to recalc remaining
      this.countSubject.next(this.count);
    }
    this.persistToRemoteIfUser({ limit });
  }

  setCount(count: number): void {
    if (!Number.isFinite(count) || count < 0) return;
    this.writeCountFor(this.currentSubjectId, Math.min(count, this.limit));
    this.persistToRemoteIfUser({ count: this.count });
  }

  isLimited(): boolean { return this.count >= this.limit; }

  constructor() {
    // Migrate legacy global keys to device-scoped keys once
    this.migrateLegacyKeysToDevice();

    // Re-evaluate subject when auth session changes (e.g., sign-in/out)
    this.supabase.session$.subscribe(() => {
      const previousSubjectId = this.currentSubjectId;
      const nextSubjectId = this.computeSubjectId();
      if (previousSubjectId === nextSubjectId) return;
      this.migrateDeviceCountToUserIfNeeded(previousSubjectId, nextSubjectId);
      this.currentSubjectId = nextSubjectId;
      this.countSubject.next(this.readCountFor(this.currentSubjectId));
      // If now signed-in, sync with remote and carry the max
      const userId = this.supabase.session?.user?.id;
      if (userId) this.syncWithRemoteForUser(userId);
    });

    // If already signed-in on load, sync
    const userId = this.supabase.session?.user?.id;
    if (userId) this.syncWithRemoteForUser(userId);
  }

  private isSignedIn(): boolean {
    const session = this.supabase.session;
    return !!session?.user?.id;
  }

  private computeSubjectId(): string {
    const userId = this.supabase.session?.user?.id;
    if (userId) return `user:${userId}`;
    return `device:${this.ensureDeviceId()}`;
  }

  private ensureDeviceId(): string {
    let id = localStorage.getItem(UsageGateService.DEVICE_ID_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(UsageGateService.DEVICE_ID_KEY, id);
    }
    return id;
  }

  private countKey(subjectId: string): string {
    return `${UsageGateService.NAMESPACE_PREFIX}:${subjectId}:count`;
  }

  private limitKey(subjectId: string): string {
    return `${UsageGateService.NAMESPACE_PREFIX}:${subjectId}:limit`;
  }

  private readCountFor(subjectId: string): number {
    return Number(localStorage.getItem(this.countKey(subjectId)) || '0');
  }

  private writeCountFor(subjectId: string, value: number): void {
    localStorage.setItem(this.countKey(subjectId), String(value));
    // Update observable if writing for the active subject
    if (subjectId === this.currentSubjectId) {
      this.countSubject.next(value);
    }
  }

  private migrateLegacyKeysToDevice(): void {
    const legacyCount = localStorage.getItem(UsageGateService.LEGACY_COUNT_KEY);
    const legacyLimit = localStorage.getItem(UsageGateService.LEGACY_LIMIT_KEY);
    if (legacyCount !== null) {
      const deviceSubject = `device:${this.ensureDeviceId()}`;
      const deviceCountKey = this.countKey(deviceSubject);
      if (localStorage.getItem(deviceCountKey) === null) {
        localStorage.setItem(deviceCountKey, legacyCount);
      }
      localStorage.removeItem(UsageGateService.LEGACY_COUNT_KEY);
    }
    if (legacyLimit !== null) {
      const deviceSubject = `device:${this.ensureDeviceId()}`;
      const deviceLimitKey = this.limitKey(deviceSubject);
      if (localStorage.getItem(deviceLimitKey) === null) {
        localStorage.setItem(deviceLimitKey, legacyLimit);
      }
      localStorage.removeItem(UsageGateService.LEGACY_LIMIT_KEY);
    }
  }

  private migrateDeviceCountToUserIfNeeded(previousSubjectId: string, nextSubjectId: string): void {
    // If moving from device -> user, carry over the higher count so users can't reset by signing in
    const wasDevice = previousSubjectId.startsWith('device:');
    const isUser = nextSubjectId.startsWith('user:');
    if (!wasDevice || !isUser) return;
    const deviceCount = this.readCountFor(previousSubjectId);
    const userCount = this.readCountFor(nextSubjectId);
    if (deviceCount > userCount) {
      this.writeCountFor(nextSubjectId, deviceCount);
    }
    // Also carry over limit if user has none
    const deviceLimitRaw = localStorage.getItem(this.limitKey(previousSubjectId));
    const userLimitRaw = localStorage.getItem(this.limitKey(nextSubjectId));
    if (deviceLimitRaw !== null && userLimitRaw === null) {
      localStorage.setItem(this.limitKey(nextSubjectId), deviceLimitRaw);
    }
  }

  private async syncWithRemoteForUser(userId: string): Promise<void> {
    try {
      const client = this.supabase.getClient();
      if (!client) return;
      const { data, error } = await client
        .from(UsageGateService.REMOTE_TABLE)
        .select('count, limit')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return;
      if (!data) return; // no row yet
      const remoteCount = Number((data as any).count ?? 0);
      const remoteLimit = Number((data as any).limit ?? UsageGateService.DEFAULT_LIMIT);
      const subjectId = `user:${userId}`;
      const localCount = this.readCountFor(subjectId);
      const nextCount = Math.max(localCount, remoteCount);
      this.writeCountFor(subjectId, nextCount);
      localStorage.setItem(this.limitKey(subjectId), String(remoteLimit));
      if (subjectId === this.currentSubjectId) this.countSubject.next(nextCount);
    } catch {}
  }

  private async persistToRemoteIfUser(payload: { count?: number; limit?: number }): Promise<void> {
    try {
      const userId = this.supabase.session?.user?.id;
      const client = this.supabase.getClient();
      if (!userId || !client) return;
      const row: any = { user_id: userId };
      if (payload.count !== undefined) row.count = payload.count;
      if (payload.limit !== undefined) row.limit = payload.limit;
      await client.from(UsageGateService.REMOTE_TABLE).upsert(row, { onConflict: 'user_id' });
    } catch {}
  }
}



