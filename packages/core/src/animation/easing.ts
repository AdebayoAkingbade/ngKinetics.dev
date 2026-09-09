import type {
  MotionCubicBezier,
  MotionEasing,
  MotionEasingInput,
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

function isCubicBezier(easing: readonly unknown[]): easing is MotionCubicBezier {
  return easing.length === 4 && easing.every((entry) => typeof entry === 'number');
}

function isEasingList(
  easing: MotionEasingInput
): easing is readonly MotionEasing[] {
  return Array.isArray(easing) && !isCubicBezier(easing);
}

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

export function resolveEasingInput(easing: MotionEasingInput | undefined): string {
  if (easing !== undefined && isEasingList(easing) && easing.length > 0) {
    return resolveEasing(easing[0]);
  }

  return resolveEasing(easing as MotionEasing | undefined);
}

export function resolveEasingList(
  easing: MotionEasingInput | undefined
): string[] | undefined {
  if (easing === undefined || !isEasingList(easing)) {
    return undefined;
  }

  if (easing.length === 0) {
    throw new Error('Motion transition ease arrays must contain at least one easing.');
  }

  return easing.map((entry) => resolveEasing(entry));
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
    easing: resolveEasingInput(transition?.ease),
    fill: transition?.fill ?? 'both',
    iterations: transition?.iterations ?? 1
  };
}
