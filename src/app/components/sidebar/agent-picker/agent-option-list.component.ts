import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-agent-option-list',
  template: `
    <div class="agent-options" tabindex="0" (keydown)="keydownEvent.emit($event)">
      @for (appName of apps; track appName; let i = $index) {
        <app-agent-option-item
          class="agent-option"
          [label]="appName"
          [active]="i === activeIndex"
          (click)="onSelect(appName)"
        ></app-agent-option-item>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AgentOptionListComponent {
  @Input() apps: string[] = [];
  @Input() activeIndex: number = 0;
  @Output() keydownEvent = new EventEmitter<KeyboardEvent>();
  @Output() select = new EventEmitter<string>();

  onSelect(appName: string) {
    this.select.emit(appName);
  }
}


