import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { createClient, SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js';

type RuntimeConfig = {
  backendUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client?: SupabaseClient;
  private sessionSubject = new BehaviorSubject<Session | null>(null);
  readonly session$ = this.sessionSubject.asObservable();

  get session(): Session | null { return this.sessionSubject.value; }

  constructor() {
    const cfg: RuntimeConfig = (window as any)['runtimeConfig'] || {};
    if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
      this.client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });

      // Initialize current session
      this.client.auth.getSession().then(({ data }) => {
        this.sessionSubject.next(data.session ?? null);
      });

      // Listen for auth changes
      this.client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        this.sessionSubject.next(session);
      });
    }
  }

  getClient(): SupabaseClient | undefined {
    return this.client;
  }

  async signInWithPassword(email: string, password: string) {
    if (!this.client) throw new Error('Supabase not configured');
    return this.client.auth.signInWithPassword({ email, password });
  }

  async signUpWithPassword(email: string, password: string) {
    if (!this.client) throw new Error('Supabase not configured');
    return this.client.auth.signUp({ email, password });
  }

  async signOut() {
    if (!this.client) return;
    await this.client.auth.signOut();
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.client) return null;
    const { data } = await this.client.auth.getSession();
    return data.session?.access_token ?? null;
  }
}


