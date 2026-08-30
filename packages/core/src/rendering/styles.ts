import type {
  MotionKeyframeValue,
  MotionResolvedTarget,
  MotionStyleProperty,
  MotionStyleValue,
  MotionTarget
} from '../animation/types';
import { buildTransform, isTransformProperty } from './transform';

type TargetEntry = [MotionStyleProperty, MotionKeyframeValue];

function targetEntries(target: MotionTarget): TargetEntry[] {
  return Object.entries(target) as TargetEntry[];
}

function isKeyframeList(
  value: MotionKeyframeValue | undefined
): value is readonly MotionStyleValue[] {
  return Array.isArray(value);
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

export function resolveFinalTarget(target: MotionTarget): MotionResolvedTarget {
  const resolved: MotionResolvedTarget = {};

  for (const [property, value] of targetEntries(target)) {
    resolved[property] = finalValue(value);
  }

  return resolved;
}

export function buildStyleMap(target: MotionResolvedTarget): Record<string, string> {
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
  to: MotionTarget
): Keyframe[] {
  const properties = collectProperties(from, to);
  const frameCount = Math.max(
    2,
    ...targetEntries(to).map(([, value]) =>
      isKeyframeList(value) ? value.length : 1
    )
  );

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

    return buildStyleMap(frame);
  });
}
