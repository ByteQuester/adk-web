import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChatMessage } from '../core/chat.models';

@Component({
  selector: 'app-chat-message-list',
  templateUrl: './chat-message-list.component.html',
  styleUrls: ['./chat-message-list.component.scss'],
  standalone: false,
})
export class ChatMessageListComponent {
  @Input() messages: ChatMessage[] = [];
  @Input() hoveredEventMessageIndices: number[] = [];
  @Input() MediaType: any;
  @Input() userEditEvalCaseMessage: string = '';
  @Input() evalCase: any;
  @Input() isEvalEditMode: boolean = false;
  @Input() isEvalCaseEditing: boolean = false;
  @Input() isEditFunctionArgsEnabledObs: any;
  @Input() getAgentNameFromEvent!: (i: number) => string;
  @Input() customIconColorClass!: (i: number) => string;
  @Input() renderGooglerSearch!: (html: string) => any;
  @Input() openBase64InNewTab!: (data: string, mime: string) => void;

  @Output() clickEventIndex = new EventEmitter<number>();
  @Output() cancelEditMessage = new EventEmitter<any>();
  @Output() saveEditMessage = new EventEmitter<any>();
  @Output() handleKeydown = new EventEmitter<{ event: KeyboardEvent, message: any }>();
  @Output() editEvalCaseMessage = new EventEmitter<any>();
  @Output() deleteEvalCaseMessage = new EventEmitter<{ message: any, index: number }>();
  @Output() editFunctionArgs = new EventEmitter<any>();
  @Output() openViewImageDialog = new EventEmitter<string | null>();

  shouldMessageHighlighted(index: number) {
    return this.hoveredEventMessageIndices.includes(index);
  }
}


