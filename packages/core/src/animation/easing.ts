import type {
  MotionEasing,
  MotionTransition,
  ResolvedMotionTransition
} from './types';

const defaultDurationSeconds = 0.3;

const namedEasings = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  circIn: 'cubic-bezier(0.55, 0, 1, 0.45)',
  circOut: 'cubic-bezier(0, 0.55, 0.45, 1)',
  backOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
} as const satisfies Record<string, string>;

export function resolveEasing(easing: MotionEasing | undefined): string {
  if (easing === undefined) {
    return namedEasings.out;
  }

  if (Array.isArray(easing)) {
    const [x1, y1, x2, y2] = easing;
    return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  }

  const easingText = String(easing);
  return namedEasings[easingText as keyof typeof namedEasings] ?? easingText;
}

export function resolveTransition(
  transition: MotionTransition | undefined
): ResolvedMotionTransition {
  const duration = transition?.duration ?? defaultDurationSeconds;
  const delay = transition?.delay ?? 0;

  if (duration < 0) {
    throw new Error('Motion transition duration cannot be negative.');
  }

  if (delay < 0) {
    throw new Error('Motion transition delay cannot be negative.');
  }

  return {
    delayMs: delay * 1000,
    direction: transition?.direction ?? 'normal',
    durationMs: duration * 1000,
    easing: resolveEasing(transition?.ease),
    fill: transition?.fill ?? 'both',
    iterations: transition?.iterations ?? 1
  };
}
