import type {
  MotionResolvedTarget,
  MotionStyleProperty,
  MotionStyleValue,
  MotionTransformProperty
} from '../animation/types';

const transformOrder = [
  'perspective',
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
  'skewY'
] as const satisfies readonly MotionTransformProperty[];

const transformProperties = new Set<string>(transformOrder);

export function isTransformProperty(
  property: MotionStyleProperty
): property is MotionTransformProperty {
  return transformProperties.has(property);
}

function lengthValue(value: MotionStyleValue): string {
  return typeof value === 'number' ? `${value}px` : value;
}

function angleValue(value: MotionStyleValue): string {
  return typeof value === 'number' ? `${value}deg` : value;
}

function scaleValue(value: MotionStyleValue): string {
  return String(value);
}

function transformFunction(
  property: MotionTransformProperty,
  value: MotionStyleValue
): string {
  switch (property) {
    case 'x':
    case 'translateX':
      return `translateX(${lengthValue(value)})`;
    case 'y':
    case 'translateY':
      return `translateY(${lengthValue(value)})`;
    case 'z':
    case 'translateZ':
      return `translateZ(${lengthValue(value)})`;
    case 'scale':
      return `scale(${scaleValue(value)})`;
    case 'scaleX':
      return `scaleX(${scaleValue(value)})`;
    case 'scaleY':
      return `scaleY(${scaleValue(value)})`;
    case 'scaleZ':
      return `scaleZ(${scaleValue(value)})`;
    case 'rotate':
    case 'rotateZ':
      return `rotate(${angleValue(value)})`;
    case 'rotateX':
      return `rotateX(${angleValue(value)})`;
    case 'rotateY':
      return `rotateY(${angleValue(value)})`;
    case 'skewX':
      return `skewX(${angleValue(value)})`;
    case 'skewY':
      return `skewY(${angleValue(value)})`;
    case 'perspective':
      return `perspective(${lengthValue(value)})`;
  }
}

export function buildTransform(target: MotionResolvedTarget): string | undefined {
  const transforms: string[] = [];

  for (const property of transformOrder) {
    const value = target[property];
    if (value !== undefined) {
      transforms.push(transformFunction(property, value));
    }
  }

  return transforms.length > 0 ? transforms.join(' ') : undefined;
}
