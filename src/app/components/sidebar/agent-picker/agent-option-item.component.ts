import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-agent-option-item',
  template: `{{ label }}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AgentOptionItemComponent {
  @Input() label: string = '';
  @Input() active: boolean = false;
  @Output() select = new EventEmitter<void>();

  @HostBinding('class.active') get isActive() { return this.active; }

  @HostListener('click') onClick() {
    this.select.emit();
  }
}


