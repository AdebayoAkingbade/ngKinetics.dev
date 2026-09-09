import { InjectionToken } from '@angular/core';

export interface MotionPresenceParticipant {
  cancelExit(): void;
  startExitAnimation(): Promise<void>;
}

export class MotionPresenceContext {
  private readonly participants = new Set<MotionPresenceParticipant>();

  register(participant: MotionPresenceParticipant): () => void {
    this.participants.add(participant);

    return () => {
      this.participants.delete(participant);
    };
  }

  cancelExit(): void {
    for (const participant of this.participants) {
      participant.cancelExit();
    }
  }

  async startExit(): Promise<void> {
    await Promise.all(
      Array.from(this.participants, (participant) =>
        participant.startExitAnimation()
      )
    );
  }
}

export const MOTION_PRESENCE_CONTEXT =
  new InjectionToken<MotionPresenceContext>('Angular Motion presence context');
