import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { UsageGateService } from './usage-gate.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatProgressBarModule, RouterLink],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent {
  protected usage = inject(UsageGateService);

  get usagePercent(): number {
    if (this.usage.limit <= 0) return 0;
    return Math.min(100, Math.round((this.usage.count / this.usage.limit) * 100));
  }
}


