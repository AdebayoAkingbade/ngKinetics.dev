import type { MotionPresetDefinition } from '@angular-motion/core';

export const fadeIn: MotionPresetDefinition = {
  animate: { opacity: 1 },
  initial: { opacity: 0 },
  transition: { duration: 0.24, ease: 'out' }
};

export const fadeUp: MotionPresetDefinition = {
  animate: { opacity: 1, y: 0 },
  initial: { opacity: 0, y: 24 },
  transition: { duration: 0.36, ease: 'out' }
};

export const scaleIn: MotionPresetDefinition = {
  animate: { opacity: 1, scale: 1 },
  initial: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.28, ease: 'out' },
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 }
};

export const angularMotionPresets = {
  fadeIn,
  fadeUp,
  scaleIn
} as const satisfies Record<string, MotionPresetDefinition>;
