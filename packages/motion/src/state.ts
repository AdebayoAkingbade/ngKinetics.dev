import type {
  MotionKeyframeValue,
  MotionPresetDefinition,
  MotionStateDefinition,
  MotionStateInput,
  MotionStyleValue,
  MotionTarget,
  MotionTransition,
  MotionVariantObject,
  MotionVariantResolver,
  MotionVariants
} from '@angular-motion/core';

export interface ResolvedMotionState {
  target: MotionTarget;
  transition?: MotionTransition;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMotionStyleValue(value: unknown): value is MotionStyleValue {
  return typeof value === 'number' || typeof value === 'string';
}

function isMotionKeyframeValue(value: unknown): value is MotionKeyframeValue {
  return (
    isMotionStyleValue(value) ||
    (Array.isArray(value) && value.every(isMotionStyleValue))
  );
}

function assertMotionTarget(value: Record<string, unknown>, context: string): MotionTarget {
  for (const [property, propertyValue] of Object.entries(value)) {
    if (!isMotionKeyframeValue(propertyValue)) {
      throw new Error(
        `Invalid motion target for "${context}". Property "${property}" must be a string, number, or keyframe array.`
      );
    }
  }

  return value as MotionTarget;
}

function isMotionStateDefinition(value: unknown): value is MotionStateDefinition {
  return isRecord(value) && isRecord(value.target);
}

function isMotionTransition(value: unknown): value is MotionTransition {
  return isRecord(value);
}

function isVariantResolver<TCustom>(
  value: unknown
): value is MotionVariantResolver<TCustom> {
  return typeof value === 'function';
}

function variantObjectState(
  value: MotionVariantObject,
  context: string
): ResolvedMotionState {
  const { transition, ...target } = value;

  if (transition !== undefined && !isMotionTransition(transition)) {
    throw new Error(`Invalid transition supplied for "${context}".`);
  }

  return resolvedState(assertMotionTarget(target, context), transition);
}

function resolvedState(
  target: MotionTarget,
  transition: MotionTransition | undefined
): ResolvedMotionState {
  return transition === undefined ? { target } : { target, transition };
}

export function resolveMotionState(
  input: MotionStateInput,
  variants: MotionVariants,
  context: string,
  custom?: unknown
): ResolvedMotionState | undefined {
  if (input === undefined || input === null || input === false) {
    return undefined;
  }

  if (typeof input === 'string') {
    const variant = variants[input];

    if (variant === undefined) {
      throw new Error(`Unknown motion variant "${input}" referenced by "${context}".`);
    }

    if (isVariantResolver(variant)) {
      return resolveMotionState(
        variant(custom),
        variants,
        `variant:${input}`,
        custom
      );
    }

    return resolveMotionState(variant, variants, `variant:${input}`, custom);
  }

  if (isMotionStateDefinition(input)) {
    return resolvedState(
      assertMotionTarget(input.target, context),
      input.transition
    );
  }

  if (isRecord(input)) {
    if ('transition' in input) {
      return variantObjectState(input as MotionVariantObject, context);
    }

    return resolvedState(assertMotionTarget(input, context), undefined);
  }

  throw new Error(`Invalid motion state supplied for "${context}".`);
}

export function resolveMotionPreset(
  presetInput: MotionPresetDefinition | string | null | undefined,
  presets: Record<string, MotionPresetDefinition>
): MotionPresetDefinition | undefined {
  if (presetInput === undefined || presetInput === null) {
    return undefined;
  }

  if (typeof presetInput === 'string') {
    const preset = presets[presetInput];

    if (preset === undefined) {
      throw new Error(`Unknown motion preset "${presetInput}".`);
    }

    return preset;
  }

  return presetInput;
}

export function mergeVariants(
  preset: MotionPresetDefinition | undefined,
  variants: MotionVariants | undefined
): MotionVariants {
  return {
    ...(preset?.variants ?? {}),
    ...(variants ?? {})
  };
}

export function mergeTargets(states: readonly ResolvedMotionState[]): MotionTarget {
  return states.reduce<MotionTarget>(
    (target, state) => ({
      ...target,
      ...state.target
    }),
    {}
  );
}

export function lastStateTransition(
  states: readonly ResolvedMotionState[]
): MotionTransition | undefined {
  for (let index = states.length - 1; index >= 0; index -= 1) {
    const state = states[index];

    if (state?.transition !== undefined) {
      return state.transition;
    }
  }

  return undefined;
}
