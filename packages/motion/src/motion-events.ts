import type { MotionTarget, MotionTransition } from '@angular-motion/core';

export type MotionTrigger =
  | 'animate'
  | 'controls'
  | 'exit'
  | 'focus'
  | 'hover'
  | 'inView'
  | 'initial'
  | 'tap';

export type MotionAnimationState =
  | 'idle'
  | 'initial'
  | 'animating'
  | 'hover'
  | 'tap'
  | 'focus'
  | 'inView'
  | 'exiting'
  | 'completed'
  | 'cancelled';

export type MotionCancelReason =
  | 'destroyed'
  | 'imperative-stop'
  | 'presence-restored'
  | 'replaced';

export interface MotionLifecycleEvent {
  readonly element: HTMLElement;
  readonly target: MotionTarget;
  readonly transition: MotionTransition;
  readonly trigger: MotionTrigger;
  readonly state: MotionAnimationState;
  readonly timestamp: number;
}

export interface MotionCancelEvent extends MotionLifecycleEvent {
  readonly reason: MotionCancelReason;
}
