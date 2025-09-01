/**
 * @license
 * Copyright 2025 Google LLC
 */
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-upgrade-cta',
  templateUrl: './upgrade-cta.component.html',
  styleUrls: ['./upgrade-cta.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule]
})
export class UpgradeCtaComponent {
  @Output() close = new EventEmitter<void>();
}


