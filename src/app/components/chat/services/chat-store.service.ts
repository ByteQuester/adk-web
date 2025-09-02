import { Injectable, WritableSignal, signal } from '@angular/core';
import { ChatMessage } from '../core/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatStoreService {
  messages: WritableSignal<ChatMessage[]> = signal<ChatMessage[]>([]);
  artifacts: WritableSignal<any[]> = signal<any[]>([]);
  eventData: WritableSignal<Map<string, any>> = signal(new Map());
  streamingTextMessage = signal<ChatMessage | null>(null);
  isModelThinking = signal(false);
  bottomPanelVisible = signal(false);
  scrollInterrupted = signal<boolean>(true);

  setMessages(messages: ChatMessage[]) { this.messages.set(messages); }
  addMessage(message: ChatMessage) { this.messages.set([...this.messages(), message]); }
  replaceMessageAt(index: number, message: ChatMessage) {
    const arr = [...this.messages()];
    arr[index] = message;
    this.messages.set(arr);
  }
  addArtifact(artifact: any) { this.artifacts.set([...this.artifacts(), artifact]); }
  setEventData(map: Map<string, any>) { this.eventData.set(map); }
}


