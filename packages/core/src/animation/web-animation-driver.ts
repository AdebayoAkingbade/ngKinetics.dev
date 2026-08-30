import type { AnimationDriver, AnimationPlayback } from './driver';
import type { ResolvedMotionTransition } from './types';

export class WebAnimationDriver implements AnimationDriver {
  readonly kind = 'web-animation';

  canAnimate(element: HTMLElement): boolean {
    return typeof element.animate === 'function';
  }

  animate(
    element: HTMLElement,
    keyframes: Keyframe[],
    transition: ResolvedMotionTransition
  ): AnimationPlayback {
    if (!this.canAnimate(element)) {
      throw new Error('Web Animations API is not available on this element.');
    }

    const animation = element.animate(keyframes, {
      delay: transition.delayMs,
      direction: transition.direction,
      duration: transition.durationMs,
      easing: transition.easing,
      fill: transition.fill,
      iterations: transition.iterations
    });

    const finished = animation.finished.then(
      () => undefined,
      (error: unknown) => {
        if (animation.playState === 'idle') {
          return undefined;
        }

        throw error;
      }
    );

    return {
      finished,
      cancel: () => animation.cancel(),
      commitStyles: () => {
        if (typeof animation.commitStyles === 'function') {
          animation.commitStyles();
        }
      }
    };
  }
}
