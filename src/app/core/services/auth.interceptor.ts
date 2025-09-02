import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { URLUtil } from '../../../utils/url-util';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly supabase: SupabaseService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const apiBase = URLUtil.getApiServerBaseUrl();
    if (!apiBase || !req.url.startsWith(apiBase)) {
      return next.handle(req);
    }
    return from(this.supabase.getAccessToken()).pipe(
      switchMap((token) => {
        if (!token) return next.handle(req);
        const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        return next.handle(authReq);
      })
    );
  }
}


