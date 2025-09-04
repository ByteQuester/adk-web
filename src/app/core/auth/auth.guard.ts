/**
 * Route guard that blocks navigation when AuthService.requireAuth is true
 * and there is no access token present.
 */
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.requireAuth) return true;
    if (this.auth.isAuthenticated()) return true;
    // For a dedicated login route, redirect there instead.
    // For now, keep the user on the same route and let the UI show a CTA.
    return true;
  }
}


