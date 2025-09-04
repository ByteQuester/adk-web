/**
 * Lightweight Auth scaffold for ADK Web
 *
 * Goals
 * - Centralize access token handling for attaching Authorization headers
 * - Provide a simple way to read auth state (isAuthenticated, userId)
 * - Keep the implementation pluggable (Supabase/Auth0/custom JWT)
 *
 * Suggested production setup
 * - Use your main website to authenticate and issue short‑lived JWTs
 * - Host this app at a subdomain; pass tokens via same‑site cookies or
 *   postMessage to this window, then call `setAccessToken` below
 * - The backend should verify JWT (see backend scaffold) and ignore client userId
 */

import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Whether the UI should require auth to access protected routes. */
  requireAuth = Boolean((window as any).__ADK_REQUIRE_AUTH__ ?? false);

  /** Reactive auth state */
  private _token = signal<string | null>(this.readTokenFromStorage());
  isAuthenticated = signal<boolean>(!!this._token());

  /** Cached parsed JWT claims (best-effort; not verified client-side) */
  private _claims: Record<string, any> | null = this.safeParseJwt(this._token());

  /** Get current access token (if present). */
  getAccessToken(): string | null { return this._token(); }

  /** Subject/User identifier derived from token claims (e.g., `sub`). */
  getUserId(): string | null {
    const claims = this._claims as Record<string, unknown> | null;
    const sub = claims && typeof claims['sub'] === 'string' ? (claims['sub'] as string) : null;
    return sub;
  }

  /** Set/replace the access token received from your website/app. */
  setAccessToken(token: string | null) {
    if (token) {
      localStorage.setItem('adk.access_token', token);
      this._claims = this.safeParseJwt(token);
      this._token.set(token);
      this.isAuthenticated.set(true);
    } else {
      localStorage.removeItem('adk.access_token');
      this._claims = null;
      this._token.set(null);
      this.isAuthenticated.set(false);
    }
  }

  /**
   * Listen for postMessage tokens from your main site (optional).
   *
   * Example on parent site:
   *   childWindow.postMessage({ type: 'ADK_TOKEN', token }, origin)
   */
  startListeningForParentTokenMessages() {
    window.addEventListener('message', (event) => {
      try {
        if (!event?.data || typeof event.data !== 'object') return;
        if (event.data.type === 'ADK_TOKEN' && event.data.token) {
          this.setAccessToken(event.data.token);
        }
      } catch {}
    });
  }

  // Utilities
  private readTokenFromStorage(): string | null {
    try { return localStorage.getItem('adk.access_token'); } catch { return null; }
  }

  private safeParseJwt(token: string | null): Record<string, any> | null {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload || null;
    } catch { return null; }
  }
}


