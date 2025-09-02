import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-upgrade-cta',
  templateUrl: './upgrade-cta.component.html',
  styleUrls: ['./upgrade-cta.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, RouterLink]
})
export class UpgradeCtaComponent {
  @Output() close = new EventEmitter<void>();
}


