import { applyTargetStyles, createDomKeyframes } from '../rendering/styles';
import { createImmediatePlayback, type AnimationDriver, type AnimationPlayback } from './driver';
import { resolveTransition } from './easing';
import type { MotionTarget, MotionTransition } from './types';
import { WebAnimationDriver } from './web-animation-driver';

export interface MotionAnimatorOptions {
  reducedMotion?: boolean;
}

export class MotionAnimator {
  constructor(private readonly driver: AnimationDriver = new WebAnimationDriver()) {}

  animate(
    element: HTMLElement,
    from: MotionTarget | undefined,
    to: MotionTarget,
    transition: MotionTransition | undefined,
    options: MotionAnimatorOptions = {}
  ): AnimationPlayback {
    if (options.reducedMotion === true || !this.driver.canAnimate(element)) {
      return createImmediatePlayback(() => applyTargetStyles(element, to));
    }

    return this.driver.animate(
      element,
      createDomKeyframes(from, to),
      resolveTransition(transition)
    );
  }
}
