import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { firstValueFrom, map, timeout, catchError, of } from 'rxjs';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);

  // If we already have a session, allow
  if (supabase.session) return true;

  // Wait briefly for initial session resolution from Supabase
  try {
    const hasSession = await firstValueFrom(
      supabase.session$.pipe(
        map((s) => !!s),
        timeout({ each: 1500, with: () => of(false) })
      )
    );
    if (hasSession) return true;
  } catch {}

  return router.parseUrl('/signin');
};


