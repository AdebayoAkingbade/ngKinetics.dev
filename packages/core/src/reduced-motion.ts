import type { ReducedMotionMode } from './animation/types';

export interface MatchMediaHost {
  matchMedia(query: string): MediaQueryList;
}

export function prefersReducedMotion(host: MatchMediaHost | undefined): boolean {
  return host?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function shouldReduceMotion(
  mode: ReducedMotionMode,
  host: MatchMediaHost | undefined
): boolean {
  switch (mode) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'user':
      return prefersReducedMotion(host);
  }
}
