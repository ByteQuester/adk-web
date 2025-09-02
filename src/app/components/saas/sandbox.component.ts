import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { UsageGateService } from './usage-gate.service';

@Component({
  selector: 'app-sandbox',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatChipsModule],
  templateUrl: './sandbox.component.html',
  styleUrls: ['./sandbox.component.scss']
})
export class SandboxComponent {
  protected usage = inject(UsageGateService);

  inc() { this.usage.increment(); }
  reset() { this.usage.reset(); }
  set5() { this.usage.setLimit(5); }
  set2() { this.usage.setLimit(2); }
  set0() { this.usage.setCount(0); }
  set4() { this.usage.setCount(4); }
}


