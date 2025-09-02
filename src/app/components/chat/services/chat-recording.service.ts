import { Inject, Injectable } from '@angular/core';
import { AUDIO_SERVICE, AudioService } from '../../../core/services/audio.service';
import { WEBSOCKET_SERVICE, WebSocketService } from '../../../core/services/websocket.service';
import { VIDEO_SERVICE, VideoService } from '../../../core/services/video.service';
import { URLUtil } from '../../../../utils/url-util';

@Injectable({ providedIn: 'root' })
export class ChatRecordingService {
  constructor(
    @Inject(AUDIO_SERVICE) private audioService: AudioService,
    @Inject(WEBSOCKET_SERVICE) private webSocketService: WebSocketService,
    @Inject(VIDEO_SERVICE) private videoService: VideoService,
  ) {}

  startAudioRecording(ctx: any) {
    if (ctx.sessionHasUsedBidi.has(ctx.sessionId)) {
      ctx.openSnackBar(ctx.BIDI_STREAMING_RESTART_WARNING ?? 'Restarting bidirectional streaming is not currently supported. Please refresh the page or start a new session.', 'OK');
      return;
    }
    ctx.isAudioRecording = true;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.webSocketService.connect(`${protocol}://${URLUtil.getWSServerUrl()}/run_live?app_name=${ctx.appName}&user_id=${ctx.userId}&session_id=${ctx.sessionId}`);
    this.audioService.startRecording();
    ctx.messages.push({ role: 'user', text: 'Speaking...' });
    ctx.messages.push({ role: 'bot', text: 'Speaking...' });
    ctx.messagesSubject.next(ctx.messages);
    ctx.sessionHasUsedBidi.add(ctx.sessionId);
  }

  stopAudioRecording(ctx: any) {
    this.audioService.stopRecording();
    this.webSocketService.closeConnection();
    ctx.isAudioRecording = false;
  }

  startVideoRecording(ctx: any) {
    if (ctx.sessionHasUsedBidi.has(ctx.sessionId)) {
      ctx.openSnackBar(ctx.BIDI_STREAMING_RESTART_WARNING ?? 'Restarting bidirectional streaming is not currently supported. Please refresh the page or start a new session.', 'OK');
      return;
    }
    ctx.isVideoRecording = true;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.webSocketService.connect(`${protocol}://${URLUtil.getWSServerUrl()}/run_live?app_name=${ctx.appName}&user_id=${ctx.userId}&session_id=${ctx.sessionId}`);
    this.videoService.startRecording(ctx.videoContainer);
    this.audioService.startRecording();
    ctx.messages.push({ role: 'user', text: 'Speaking...' });
    ctx.messagesSubject.next(ctx.messages);
    ctx.sessionHasUsedBidi.add(ctx.sessionId);
  }

  stopVideoRecording(ctx: any) {
    this.audioService.stopRecording();
    this.videoService.stopRecording(ctx.videoContainer);
    this.webSocketService.closeConnection();
    ctx.isVideoRecording = false;
  }
}


