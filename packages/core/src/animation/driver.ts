import type { ResolvedMotionTransition } from './types';

export interface AnimationPlayback {
  readonly finished: Promise<void>;
  cancel(): void;
  commitStyles(): void;
}

export interface AnimationDriver {
  readonly kind: string;
  canAnimate(element: HTMLElement): boolean;
  animate(
    element: HTMLElement,
    keyframes: Keyframe[],
    transition: ResolvedMotionTransition
  ): AnimationPlayback;
}

export function createImmediatePlayback(applyFinalStyles: () => void): AnimationPlayback {
  applyFinalStyles();

  return {
    finished: Promise.resolve(),
    cancel: () => undefined,
    commitStyles: applyFinalStyles
  };
}
