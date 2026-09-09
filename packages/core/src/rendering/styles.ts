import type {
  MotionEasingInput,
  MotionKeyframeValue,
  MotionResolvedTarget,
  MotionStyleProperty,
  MotionStyleValue,
  MotionTarget,
  MotionTransition
} from '../animation/types';
import { resolveEasingList } from '../animation/easing';
import { buildTransform, isTransformProperty } from './transform';

type TargetEntry = [MotionStyleProperty, MotionKeyframeValue];

const knownMotionStyleProperties = new Set<string>([
  'x',
  'y',
  'z',
  'translateX',
  'translateY',
  'translateZ',
  'scale',
  'scaleX',
  'scaleY',
  'scaleZ',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'skewX',
  'skewY',
  'perspective',
  'opacity',
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'boxShadow',
  'clipPath',
  'color',
  'filter',
  'height',
  'left',
  'right',
  'top',
  'bottom',
  'transform',
  'transformOrigin',
  'width'
]);

function targetEntries(target: MotionTarget): TargetEntry[] {
  return Object.entries(target) as TargetEntry[];
}

function isCustomProperty(property: string): boolean {
  return /^--[A-Za-z_][A-Za-z0-9_-]*$/.test(property);
}

function isKeyframeList(
  value: MotionKeyframeValue | undefined
): value is readonly MotionStyleValue[] {
  return Array.isArray(value);
}

function validateMotionStyleProperty(
  property: MotionStyleProperty,
  context: string
): void {
  if (knownMotionStyleProperties.has(property) || isCustomProperty(property)) {
    return;
  }

  throw new Error(
    `Motion ${context} property "${property}" is not supported. Use a typed motion property or a CSS custom property such as "--motion-value".`
  );
}

function validateMotionStyleValue(
  value: MotionStyleValue,
  property: MotionStyleProperty,
  context: string
): void {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`Motion ${context} property "${property}" must be a finite number.`);
  }

  if (typeof value === 'string' && value.length === 0) {
    throw new Error(`Motion ${context} property "${property}" cannot be an empty string.`);
  }
}

function keyframeAt(
  values: readonly MotionStyleValue[],
  index: number
): MotionStyleValue {
  const value = values[Math.min(index, values.length - 1)];

  if (value === undefined) {
    throw new Error('Motion keyframe arrays must contain at least one value.');
  }

  return value;
}

function validateKeyframeList(
  property: MotionStyleProperty,
  values: readonly MotionStyleValue[],
  context: string
): void {
  if (values.length === 0) {
    throw new Error(`Motion ${context} keyframes for "${property}" must contain at least one value.`);
  }

  for (const value of values) {
    validateMotionStyleValue(value, property, context);
  }
}

function finalValue(value: MotionKeyframeValue): MotionStyleValue {
  return isKeyframeList(value) ? keyframeAt(value, value.length - 1) : value;
}

function firstValue(value: MotionKeyframeValue): MotionStyleValue {
  return isKeyframeList(value) ? keyframeAt(value, 0) : value;
}

function cssPropertyName(property: MotionStyleProperty): string {
  if (property.startsWith('--')) {
    return property;
  }

  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function cssValue(value: MotionStyleValue): string {
  return String(value);
}

function collectProperties(
  from: MotionTarget | undefined,
  to: MotionTarget
): MotionStyleProperty[] {
  return Array.from(
    new Set([
      ...(from ? targetEntries(from).map(([property]) => property) : []),
      ...targetEntries(to).map(([property]) => property)
    ])
  );
}

function validateTarget(target: MotionTarget, context: string): void {
  for (const [property, value] of targetEntries(target)) {
    validateMotionStyleProperty(property, context);

    if (isKeyframeList(value)) {
      validateKeyframeList(property, value, context);
    } else {
      validateMotionStyleValue(value, property, context);
    }
  }
}

function validateTimes(
  times: readonly number[] | undefined,
  frameCount: number
): void {
  if (times === undefined) {
    return;
  }

  if (times.length !== frameCount) {
    throw new Error(
      `Motion transition times must contain ${frameCount} entries for this keyframe animation.`
    );
  }

  let previous = -Infinity;

  for (const time of times) {
    if (!Number.isFinite(time) || time < 0 || time > 1) {
      throw new Error('Motion transition times must be finite numbers between 0 and 1.');
    }

    if (time < previous) {
      throw new Error('Motion transition times must be sorted in ascending order.');
    }

    previous = time;
  }
}

function validateEasingList(
  easing: MotionEasingInput | undefined,
  frameCount: number
): string[] | undefined {
  const easingList = resolveEasingList(easing);

  if (easingList !== undefined && easingList.length > frameCount - 1) {
    throw new Error(
      `Motion transition ease arrays can contain at most ${frameCount - 1} entries for this keyframe animation.`
    );
  }

  return easingList;
}

export function resolveFinalTarget(target: MotionTarget): MotionResolvedTarget {
  validateTarget(target, 'target');

  const resolved: MotionResolvedTarget = {};

  for (const [property, value] of targetEntries(target)) {
    resolved[property] = finalValue(value);
  }

  return resolved;
}

export function buildStyleMap(target: MotionResolvedTarget): Record<string, string> {
  validateTarget(target, 'resolved target');

  const styles: Record<string, string> = {};
  const transform = buildTransform(target);

  for (const [property, value] of Object.entries(target) as Array<
    [MotionStyleProperty, MotionStyleValue]
  >) {
    if (isTransformProperty(property)) {
      continue;
    }

    styles[cssPropertyName(property)] = cssValue(value);
  }

  if (transform !== undefined) {
    styles.transform = transform;
  }

  return styles;
}

export function applyStyleMap(
  element: HTMLElement,
  styles: Record<string, string>
): void {
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(property, value);
  }
}

export function applyTargetStyles(
  element: HTMLElement,
  target: MotionTarget
): void {
  applyStyleMap(element, buildStyleMap(resolveFinalTarget(target)));
}

export function createDomKeyframes(
  from: MotionTarget | undefined,
  to: MotionTarget,
  transition: MotionTransition | undefined = undefined
): Keyframe[] {
  if (from !== undefined) {
    validateTarget(from, 'from');
  }

  validateTarget(to, 'to');

  const properties = collectProperties(from, to);
  const frameCount = Math.max(
    2,
    ...targetEntries(to).map(([, value]) =>
      isKeyframeList(value) ? value.length : 1
    )
  );
  const times = transition?.times;
  const easingList = validateEasingList(transition?.ease, frameCount);

  validateTimes(times, frameCount);

  return Array.from({ length: frameCount }, (_, index) => {
    const frame: MotionResolvedTarget = {};

    for (const property of properties) {
      const toValue = to[property];
      const fromValue = from?.[property];

      if (isKeyframeList(toValue)) {
        frame[property] = keyframeAt(toValue, index);
      } else if (index === 0 && fromValue !== undefined) {
        frame[property] = firstValue(fromValue);
      } else if (toValue !== undefined) {
        frame[property] = finalValue(toValue);
      } else if (fromValue !== undefined) {
        frame[property] = finalValue(fromValue);
      }
    }

    const styleMap = buildStyleMap(frame) as Keyframe;
    const offset = times?.[index];
    const easing = easingList?.[index];

    if (offset !== undefined) {
      styleMap.offset = offset;
    }

    if (easing !== undefined) {
      styleMap.easing = easing;
    }

    return styleMap;
  });
}
