export type MotionTransformProperty =
  | 'x'
  | 'y'
  | 'z'
  | 'translateX'
  | 'translateY'
  | 'translateZ'
  | 'scale'
  | 'scaleX'
  | 'scaleY'
  | 'scaleZ'
  | 'rotate'
  | 'rotateX'
  | 'rotateY'
  | 'rotateZ'
  | 'skewX'
  | 'skewY'
  | 'perspective';

export type KnownMotionStyleProperty =
  | MotionTransformProperty
  | 'opacity'
  | 'backgroundColor'
  | 'borderColor'
  | 'borderRadius'
  | 'boxShadow'
  | 'clipPath'
  | 'color'
  | 'filter'
  | 'height'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'transform'
  | 'transformOrigin'
  | 'width';

export type MotionStyleProperty = KnownMotionStyleProperty | `--${string}`;
export type MotionStyleValue = number | string;
export type MotionKeyframeValue =
  | MotionStyleValue
  | readonly MotionStyleValue[];
export type MotionTarget = {
  [Property in MotionStyleProperty]?: MotionKeyframeValue;
};
export type MotionResolvedTarget = Partial<
  Record<MotionStyleProperty, MotionStyleValue>
>;

export type MotionEasingName =
  | 'linear'
  | 'in'
  | 'out'
  | 'inOut'
  | 'circIn'
  | 'circOut'
  | 'backOut';

export type MotionCubicBezier = readonly [
  number,
  number,
  number,
  number
];

export type MotionEasing =
  | MotionEasingName
  | MotionCubicBezier
  | (string & {});

export type MotionEasingInput = MotionEasing | readonly MotionEasing[];

export interface MotionTransition {
  duration?: number;
  delay?: number;
  ease?: MotionEasingInput;
  fill?: FillMode;
  direction?: PlaybackDirection;
  iterations?: number;
  times?: readonly number[];
}

export interface ResolvedMotionTransition {
  durationMs: number;
  delayMs: number;
  easing: string;
  fill: FillMode;
  direction: PlaybackDirection;
  iterations: number;
}

export interface MotionStateDefinition {
  target: MotionTarget;
  transition?: MotionTransition;
}

export type MotionVariantResolver<TCustom = unknown> = (
  custom: TCustom
) => MotionStateDefinition | MotionVariantObject;

export type MotionVariantObject = MotionTarget & {
  transition?: MotionTransition;
};

export type MotionVariantLabel = string;
export type MotionStateInput =
  | MotionTarget
  | MotionStateDefinition
  | MotionVariantLabel
  | false
  | null
  | undefined;

export type MotionVariants<TCustom = unknown> = Record<
  MotionVariantLabel,
  MotionStateDefinition | MotionVariantObject | MotionVariantResolver<TCustom>
>;

export interface MotionPresetDefinition {
  initial?: MotionStateInput;
  animate?: MotionStateInput;
  whileHover?: MotionStateInput;
  whileTap?: MotionStateInput;
  whileFocus?: MotionStateInput;
  whileInView?: MotionStateInput;
  exit?: MotionStateInput;
  transition?: MotionTransition;
  variants?: MotionVariants;
}

export type ReducedMotionMode = 'user' | 'always' | 'never';

export interface MotionViewportOptions {
  root?: Element | Document | null;
  margin?: string;
  amount?: 'some' | 'all' | number;
  once?: boolean;
}
