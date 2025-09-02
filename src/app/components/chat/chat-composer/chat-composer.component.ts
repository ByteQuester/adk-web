import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-chat-composer',
  templateUrl: './chat-composer.component.html',
  styleUrls: ['./chat-composer.component.scss'],
  standalone: false,
})
export class ChatComposerComponent {
  @Input() appName: string = '';
  @Input() isChatMode: boolean = true;
  @Input() selectedFiles: { file: File; url: string }[] = [];
  @Input() updatedSessionState: any = null;
  @Input() userInput: string = '';
  @Output() userInputChange = new EventEmitter<string>();
  @Input() isAudioRecording: boolean = false;
  @Input() isVideoRecording: boolean = false;

  @Output() fileSelect = new EventEmitter<Event>();
  @Output() removeFile = new EventEmitter<number>();
  @Output() removeStateUpdate = new EventEmitter<void>();
  @Output() sendMessage = new EventEmitter<Event>();
  @Output() toggleAudioRecording = new EventEmitter<void>();
  @Output() toggleVideoRecording = new EventEmitter<void>();
  @Output() updateState = new EventEmitter<void>();
  
}


