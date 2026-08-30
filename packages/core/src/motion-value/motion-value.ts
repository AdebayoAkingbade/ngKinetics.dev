export type MotionValueSubscriber<T> = (value: T, previous: T) => void;

export interface MotionValue<T> {
  get(): T;
  set(value: T): void;
  update(reducer: (value: T) => T): void;
  subscribe(subscriber: MotionValueSubscriber<T>): () => void;
  getVelocity(): number;
  destroy(): void;
}

interface NumericUnit {
  value: number;
  unit: string;
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}

function parseNumericUnit(value: string): NumericUnit | undefined {
  const match = /^(-?\d+(?:\.\d+)?)([a-z%]*)$/i.exec(value.trim());

  if (match === null) {
    return undefined;
  }

  const [, numericValue, unit = ''] = match;
  return {
    unit,
    value: Number(numericValue)
  };
}

function mixValues<T extends number | string>(from: T, to: T, progress: number): T {
  if (typeof from === 'number' && typeof to === 'number') {
    return (from + (to - from) * progress) as T;
  }

  if (typeof from === 'string' && typeof to === 'string') {
    const fromNumber = parseNumericUnit(from);
    const toNumber = parseNumericUnit(to);

    if (fromNumber !== undefined && toNumber !== undefined && fromNumber.unit === toNumber.unit) {
      const mixed = fromNumber.value + (toNumber.value - fromNumber.value) * progress;
      return `${mixed}${fromNumber.unit}` as T;
    }
  }

  return progress < 1 ? from : to;
}

function findRangeIndex(inputRange: readonly number[], value: number): number {
  for (let index = 0; index < inputRange.length - 1; index += 1) {
    const start = inputRange[index];
    const end = inputRange[index + 1];

    if (start === undefined || end === undefined) {
      throw new Error('Input range cannot contain undefined values.');
    }

    if ((value >= start && value <= end) || (value <= start && value >= end)) {
      return index;
    }
  }

  return value < inputRange[0]! ? 0 : inputRange.length - 2;
}

export class WritableMotionValue<T> implements MotionValue<T> {
  private current: T;
  private previous: T;
  private lastUpdatedAt = now();
  private velocity = 0;
  private readonly subscribers = new Set<MotionValueSubscriber<T>>();
  private readonly cleanups = new Set<() => void>();

  constructor(initial: T) {
    this.current = initial;
    this.previous = initial;
  }

  get(): T {
    return this.current;
  }

  set(value: T): void {
    if (Object.is(value, this.current)) {
      return;
    }

    const timestamp = now();
    const elapsedSeconds = Math.max((timestamp - this.lastUpdatedAt) / 1000, 0.001);
    const previous = this.current;

    this.previous = previous;
    this.current = value;
    this.lastUpdatedAt = timestamp;

    if (typeof value === 'number' && typeof previous === 'number') {
      this.velocity = (value - previous) / elapsedSeconds;
    } else {
      this.velocity = 0;
    }

    for (const subscriber of this.subscribers) {
      subscriber(value, previous);
    }
  }

  update(reducer: (value: T) => T): void {
    this.set(reducer(this.current));
  }

  subscribe(subscriber: MotionValueSubscriber<T>): () => void {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  getVelocity(): number {
    return this.velocity;
  }

  addCleanup(cleanup: () => void): void {
    this.cleanups.add(cleanup);
  }

  destroy(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }

    this.cleanups.clear();
    this.subscribers.clear();
  }
}

export interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
  restDelta?: number;
  restSpeed?: number;
}

export interface SpringMotionValue extends MotionValue<number> {
  stop(): void;
}

type FrameHandle = number | ReturnType<typeof setTimeout>;

function requestFrame(callback: FrameRequestCallback): FrameHandle {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return globalThis.requestAnimationFrame(callback);
  }

  return globalThis.setTimeout(() => callback(now()), 16);
}

function cancelFrame(handle: FrameHandle): void {
  if (typeof handle === 'number' && typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(handle);
    return;
  }

  globalThis.clearTimeout(handle);
}

class SpringValue extends WritableMotionValue<number> implements SpringMotionValue {
  private target: number;
  private frame: FrameHandle | undefined;
  private lastFrameAt = now();
  private currentVelocity = 0;
  private readonly unsubscribeSource: (() => void) | undefined;
  private readonly stiffness: number;
  private readonly damping: number;
  private readonly mass: number;
  private readonly restDelta: number;
  private readonly restSpeed: number;

  constructor(source: MotionValue<number> | number, config: SpringConfig) {
    const initial = typeof source === 'number' ? source : source.get();
    super(initial);

    this.target = initial;
    this.stiffness = config.stiffness ?? 170;
    this.damping = config.damping ?? 26;
    this.mass = config.mass ?? 1;
    this.restDelta = config.restDelta ?? 0.01;
    this.restSpeed = config.restSpeed ?? 2;

    if (typeof source !== 'number') {
      this.unsubscribeSource = source.subscribe((value) => {
        this.target = value;
        this.start();
      });
      this.addCleanup(this.unsubscribeSource);
    }
  }

  stop(): void {
    if (this.frame !== undefined) {
      cancelFrame(this.frame);
      this.frame = undefined;
    }
  }

  override destroy(): void {
    this.stop();
    super.destroy();
  }

  private start(): void {
    if (this.frame !== undefined) {
      return;
    }

    this.lastFrameAt = now();
    this.frame = requestFrame((time) => this.step(time));
  }

  private step(time: number): void {
    const deltaSeconds = Math.min((time - this.lastFrameAt) / 1000, 0.05);
    this.lastFrameAt = time;

    const current = this.get();
    const displacement = current - this.target;
    const springForce = -this.stiffness * displacement;
    const dampingForce = -this.damping * this.currentVelocity;
    const acceleration = (springForce + dampingForce) / this.mass;

    this.currentVelocity += acceleration * deltaSeconds;
    const next = current + this.currentVelocity * deltaSeconds;

    this.set(next);

    const isResting =
      Math.abs(this.currentVelocity) <= this.restSpeed &&
      Math.abs(this.target - next) <= this.restDelta;

    if (isResting) {
      this.set(this.target);
      this.frame = undefined;
      return;
    }

    this.frame = requestFrame((nextTime) => this.step(nextTime));
  }
}

export function motionValue<T>(initial: T): WritableMotionValue<T> {
  return new WritableMotionValue(initial);
}

export function transform<T extends number | string>(
  input: MotionValue<number>,
  inputRange: readonly number[],
  outputRange: readonly T[]
): MotionValue<T> {
  if (inputRange.length !== outputRange.length || inputRange.length < 2) {
    throw new Error('Motion transform ranges must have the same length and at least two values.');
  }

  const compute = (value: number): T => {
    const rangeIndex = findRangeIndex(inputRange, value);
    const inputStart = inputRange[rangeIndex];
    const inputEnd = inputRange[rangeIndex + 1];
    const outputStart = outputRange[rangeIndex];
    const outputEnd = outputRange[rangeIndex + 1];

    if (
      inputStart === undefined ||
      inputEnd === undefined ||
      outputStart === undefined ||
      outputEnd === undefined
    ) {
      throw new Error('Motion transform ranges cannot contain undefined values.');
    }

    const progress = inputStart === inputEnd ? 1 : (value - inputStart) / (inputEnd - inputStart);
    return mixValues(outputStart, outputEnd, Math.min(Math.max(progress, 0), 1));
  };

  const output = motionValue(compute(input.get()));
  output.addCleanup(input.subscribe((value) => output.set(compute(value))));
  return output;
}

export function velocity(input: MotionValue<number>): MotionValue<number> {
  const output = motionValue(input.getVelocity());
  output.addCleanup(input.subscribe(() => output.set(input.getVelocity())));
  return output;
}

export function spring(
  source: MotionValue<number> | number,
  config: SpringConfig = {}
): SpringMotionValue {
  return new SpringValue(source, config);
}
