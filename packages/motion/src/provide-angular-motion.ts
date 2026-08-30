import {
  InjectionToken,
  inject,
  makeEnvironmentProviders,
  type EnvironmentProviders,
  type Provider
} from '@angular/core';
import {
  MotionAnimator,
  WebAnimationDriver,
  type AnimationDriver,
  type MotionPresetDefinition,
  type MotionTransition,
  type ReducedMotionMode
} from '@angular-motion/core';

export interface AngularMotionConfig {
  reducedMotion: ReducedMotionMode;
  defaultTransition: MotionTransition;
  presets: Record<string, MotionPresetDefinition>;
}

export interface AngularMotionProviderOptions extends Partial<AngularMotionConfig> {
  driver?: AnimationDriver;
}

export const DEFAULT_ANGULAR_MOTION_CONFIG: AngularMotionConfig = {
  defaultTransition: {
    duration: 0.3,
    ease: 'out'
  },
  presets: {},
  reducedMotion: 'user'
};

export const ANGULAR_MOTION_CONFIG = new InjectionToken<AngularMotionConfig>(
  'Angular Motion configuration',
  {
    providedIn: 'root',
    factory: () => DEFAULT_ANGULAR_MOTION_CONFIG
  }
);

export const ANGULAR_MOTION_DRIVER = new InjectionToken<AnimationDriver>(
  'Angular Motion animation driver',
  {
    providedIn: 'root',
    factory: () => new WebAnimationDriver()
  }
);

export const ANGULAR_MOTION_ANIMATOR = new InjectionToken<MotionAnimator>(
  'Angular Motion animator',
  {
    providedIn: 'root',
    factory: () => new MotionAnimator(inject(ANGULAR_MOTION_DRIVER))
  }
);

export function provideAngularMotion(
  options: AngularMotionProviderOptions = {}
): EnvironmentProviders {
  const config: AngularMotionConfig = {
    defaultTransition: {
      ...DEFAULT_ANGULAR_MOTION_CONFIG.defaultTransition,
      ...options.defaultTransition
    },
    presets: {
      ...DEFAULT_ANGULAR_MOTION_CONFIG.presets,
      ...options.presets
    },
    reducedMotion:
      options.reducedMotion ?? DEFAULT_ANGULAR_MOTION_CONFIG.reducedMotion
  };

  const providers: Provider[] = [
    { provide: ANGULAR_MOTION_CONFIG, useValue: config }
  ];

  if (options.driver !== undefined) {
    providers.push({ provide: ANGULAR_MOTION_DRIVER, useValue: options.driver });
  }

  providers.push({
    provide: ANGULAR_MOTION_ANIMATOR,
    useFactory: (driver: AnimationDriver) => new MotionAnimator(driver),
    deps: [ANGULAR_MOTION_DRIVER]
  });

  return makeEnvironmentProviders(providers);
}
