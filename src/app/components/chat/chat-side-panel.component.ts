import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-chat-side-panel',
  templateUrl: './chat-side-panel.component.html',
  styleUrls: ['./chat-side-panel.component.scss'],
  standalone: false,
})
export class ChatSidePanelComponent {
  @Input() selectedEvent: any;
  @Input() selectedEventIndex: number | undefined;
  @Input() eventsCount: number = 0;
  @Input() renderedEventGraph: SafeHtml | undefined;
  @Input() rawSvgString: string | null = null;
  @Input() llmRequest: any;
  @Input() llmResponse: any;

  @Output() closePanel = new EventEmitter<void>();
  @Output() page = new EventEmitter<any>();
  @Output() viewImage = new EventEmitter<string | null>();
}




