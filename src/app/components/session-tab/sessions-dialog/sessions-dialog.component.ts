import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-sessions-dialog',
  templateUrl: './sessions-dialog.component.html',
  styleUrl: './sessions-dialog.component.scss',
  standalone: false,
})
export class SessionsDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { userId: string; appName: string; sessionId: string },
    private dialogRef: MatDialogRef<SessionsDialogComponent>,
  ) {}

  onSelected(session: any) {
    this.dialogRef.close({ selected: session });
  }

  onReloaded(session: any) {
    this.dialogRef.close({ reloaded: session });
  }
}


