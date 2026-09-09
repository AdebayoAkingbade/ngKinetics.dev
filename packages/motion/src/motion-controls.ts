import { DestroyRef, inject } from '@angular/core';
import type {
  MotionStateDefinition,
  MotionTarget,
  MotionTransition
} from '@angular-motion/core';

const controlsBrand = Symbol('AngularMotionControls');

export type MotionControlState = MotionStateDefinition | MotionTarget;

export type MotionControlCommand =
  | {
      readonly state: MotionControlState;
      readonly transition?: MotionTransition;
      readonly type: 'start';
    }
  | {
      readonly state: MotionControlState;
      readonly type: 'set';
    }
  | {
      readonly type: 'stop';
    };

export type MotionControlSubscriber = (command: MotionControlCommand) => void;

export class MotionControls<TTarget extends MotionTarget = MotionTarget> {
  readonly [controlsBrand] = true;
  private readonly subscribers = new Set<MotionControlSubscriber>();

  start(
    state: TTarget | MotionStateDefinition,
    transition?: MotionTransition
  ): void {
    this.emit(
      transition === undefined
        ? { state, type: 'start' }
        : { state, transition, type: 'start' }
    );
  }

  set(state: TTarget | MotionStateDefinition): void {
    this.emit({ state, type: 'set' });
  }

  stop(): void {
    this.emit({ type: 'stop' });
  }

  subscribe(subscriber: MotionControlSubscriber): () => void {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  destroy(): void {
    this.subscribers.clear();
  }

  private emit(command: MotionControlCommand): void {
    for (const subscriber of this.subscribers) {
      subscriber(command);
    }
  }
}

export type MotionControlsInput = MotionControls | null | undefined;

export function isMotionControls(value: unknown): value is MotionControls {
  return (
    typeof value === 'object' &&
    value !== null &&
    controlsBrand in value
  );
}

export function motionControls<TTarget extends MotionTarget = MotionTarget>(): MotionControls<TTarget> {
  return new MotionControls<TTarget>();
}

export function injectMotionControls<TTarget extends MotionTarget = MotionTarget>(): MotionControls<TTarget> {
  const destroyRef = inject(DestroyRef);
  const controls = motionControls<TTarget>();
  destroyRef.onDestroy(() => controls.destroy());
  return controls;
}
