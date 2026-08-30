import { describe, expect, it } from 'vitest';
import { motionValue, transform, velocity } from './motion-value';

describe('motion values', () => {
  it('notifies subscribers without depending on Angular change detection', () => {
    const x = motionValue(0);
    const received: number[] = [];
    const unsubscribe = x.subscribe((value) => received.push(value));

    x.set(10);
    x.set(20);
    unsubscribe();
    x.set(30);

    expect(received).toEqual([10, 20]);
  });

  it('derives transformed values from an input range', () => {
    const x = motionValue(0);
    const opacity = transform(x, [-100, 0, 100], [0, 1, 0]);

    x.set(50);

    expect(opacity.get()).toBe(0.5);
  });

  it('exposes derived velocity values', () => {
    const x = motionValue(0);
    const xVelocity = velocity(x);

    x.set(100);

    expect(xVelocity.get()).toBeGreaterThan(0);
  });
});
