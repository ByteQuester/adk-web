import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-agent-search-input',
  template: `
    <input
      class="agent-filter"
      type="text"
      placeholder="Filter agents"
      [ngModel]="value"
      (ngModelChange)="valueChange.emit($event)"
      (keydown)="keydownEvent.emit($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AgentSearchInputComponent {
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();
  @Output() keydownEvent = new EventEmitter<KeyboardEvent>();
}


