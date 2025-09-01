import { Inject, Injectable } from '@angular/core';
import { ArtifactService, ARTIFACT_SERVICE } from '../../core/services/artifact.service';
import { formatBase64Data } from './chat.utils';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatArtifactService {
  constructor(@Inject(ARTIFACT_SERVICE) private artifactService: ArtifactService) {}

  getArtifact(
    userId: string,
    appName: string,
    sessionId: string,
    artifactId: string,
    versionId: string,
  ): Observable<{ data: string; mimeType: string }> {
    return this.artifactService
      .getArtifactVersion(userId, appName, sessionId, artifactId, versionId)
      .pipe(
        map((res: any) => {
          const mimeType = res.inlineData.mimeType;
          const data = formatBase64Data(res.inlineData.data, mimeType);
          return { data, mimeType };
        }),
      );
  }
}


