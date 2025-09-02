import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { UsageGateService } from './usage-gate.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { URLUtil } from '../../../utils/url-util';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent {
  protected usage = inject(UsageGateService);
  protected supabase = inject(SupabaseService);

  get email(): string {
    return this.supabase.session?.user?.email ?? 'Guest';
  }

  get planLabel(): string {
    // Heuristic: small limits imply free trial
    return this.usage.limit <= 5 ? 'Free trial' : 'Pro';
  }

  get usagePercent(): number {
    if (this.usage.limit <= 0) return 0;
    return Math.min(100, Math.round((this.usage.count / this.usage.limit) * 100));
  }

  get backendUrl(): string | undefined {
    return URLUtil.getApiServerBaseUrl();
  }

  resetTrial() { this.usage.reset(); }
  signOut() { this.supabase.signOut(); }
}


