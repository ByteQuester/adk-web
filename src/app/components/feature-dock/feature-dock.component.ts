import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-feature-dock',
  templateUrl: './feature-dock.component.html',
  styleUrl: './feature-dock.component.scss',
  standalone: false,
})
export class FeatureDockComponent {
  @Input() selectedTab: 'trace'|'events'|'state'|'eval'|'artifacts' = 'trace';
  @Input() traceData: any[] = [];
  @Input() fullscreen: boolean = false;
  @Input() eventsMap: Map<string, any> = new Map<string, any>();
  @Input() sessionState: any = {};
  @Input() appName: string = '';
  @Input() userId: string = '';
  @Input() sessionId: string = '';
  @Input() artifacts: any[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() selectTab = new EventEmitter<'trace'|'events'|'state'|'eval'|'artifacts'>();
  @Output() selectedEvent = new EventEmitter<string>();
  @Output() openTraceDeepDive = new EventEmitter<{ traceId: string, invocId: string }>();
  @Output() shouldShowTab = new EventEmitter<boolean>();
  @Output() sessionSelected = new EventEmitter<any>();
  @Output() evalCaseSelected = new EventEmitter<any>();
  @Output() evalSetIdSelected = new EventEmitter<string>();
  @Output() shouldReturnToSession = new EventEmitter<boolean>();
  @Output() evalNotInstalledMsg = new EventEmitter<string>();

  onSelect(tab: 'trace'|'events'|'state'|'eval'|'artifacts') {
    this.selectedTab = tab;
    this.selectTab.emit(tab);
  }

  toggleLeftPanel() {
    try {
      window.dispatchEvent(new Event('toggleChatSidePanel'));
    } catch {}
  }
}


