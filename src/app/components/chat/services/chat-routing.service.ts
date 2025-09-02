import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Observable, combineLatest, filter, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatRoutingService {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly location = inject(Location);

  syncSelectedAppFromUrl$(apps$: Observable<string[] | undefined>): Observable<string | undefined> {
    return combineLatest([
      this.router.events.pipe(
        filter((e) => e instanceof NavigationEnd),
        map(() => this.activatedRoute.snapshot.queryParams),
      ),
      apps$,
    ]).pipe(
      map(([params, apps]) => {
        if (apps && apps.length) {
          const app = params['app'];
          if (app && apps.includes(app)) {
            return app as string;
          }
        }
        return undefined;
      }),
    );
  }

  navigateWithSelectedApp(app: string) {
    const selectedAgent = this.activatedRoute.snapshot.queryParams['app'];
    if (app === selectedAgent) {
      return;
    }
    this.router.navigate([], {
      queryParams: { app },
      queryParamsHandling: 'merge',
    });
  }

  updateSelectedSessionUrl(sessionId: string) {
    const url = this.router
      .createUrlTree([], {
        queryParams: { session: sessionId },
        queryParamsHandling: 'merge',
      })
      .toString();
    this.location.replaceState(url);
  }
}


