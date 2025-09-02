import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-agent-picker',
  templateUrl: './agent-picker.component.html',
  styleUrls: ['./agent-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AgentPickerComponent {
  @Input() apps: string[] = [];
  @Input() value: string = '';
  @Input() filterText: string = '';
  @Input() activeIndex: number = 0;
  @Input() isOpen: boolean = false;

  @Output() toggle = new EventEmitter<void>();
  @Output() filterKeydown = new EventEmitter<KeyboardEvent>();
  @Output() listKeydown = new EventEmitter<KeyboardEvent>();
  @Output() select = new EventEmitter<string>();

  onSelect(appName: string) {
    this.select.emit(appName);
  }
}


