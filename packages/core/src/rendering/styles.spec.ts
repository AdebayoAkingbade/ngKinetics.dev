import { describe, expect, it } from 'vitest';
import type { MotionResolvedTarget, MotionTarget } from '../animation/types';
import { buildStyleMap, createDomKeyframes } from './styles';

describe('motion style rendering', () => {
  it('serializes transform aliases into a single transform property', () => {
    expect(buildStyleMap({ opacity: 0.5, scale: 0.9, y: 24 })).toEqual({
      opacity: '0.5',
      transform: 'translateY(24px) scale(0.9)'
    });
  });

  it('creates DOM keyframes from initial and target states', () => {
    expect(
      createDomKeyframes(
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0 }
      )
    ).toEqual([
      { opacity: '0', transform: 'translateY(40px)' },
      { opacity: '1', transform: 'translateY(0px)' }
    ]);
  });

  it('expands keyframe arrays for WAAPI', () => {
    expect(createDomKeyframes(undefined, { opacity: [0, 1, 0.5] })).toEqual([
      { opacity: '0' },
      { opacity: '1' },
      { opacity: '0.5' }
    ]);
  });

  it('serializes keyframe offsets and per-segment easing', () => {
    expect(
      createDomKeyframes(
        undefined,
        { opacity: [0, 1], scale: [1, 1.2, 0.95, 1] },
        {
          ease: ['out', 'linear', 'in'],
          times: [0, 0.4, 0.75, 1]
        }
      )
    ).toEqual([
      {
        easing: 'cubic-bezier(0, 0, 0.2, 1)',
        offset: 0,
        opacity: '0',
        transform: 'scale(1)'
      },
      {
        easing: 'linear',
        offset: 0.4,
        opacity: '1',
        transform: 'scale(1.2)'
      },
      {
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
        offset: 0.75,
        opacity: '1',
        transform: 'scale(0.95)'
      },
      {
        offset: 1,
        opacity: '1',
        transform: 'scale(1)'
      }
    ]);
  });

  it('rejects empty keyframe arrays', () => {
    expect(() =>
      createDomKeyframes(undefined, { opacity: [] })
    ).toThrow(/must contain at least one value/);
  });

  it('rejects transition times that do not match keyframe length', () => {
    expect(() =>
      createDomKeyframes(undefined, { opacity: [0, 1, 0] }, { times: [0, 1] })
    ).toThrow(/times must contain 3 entries/);
  });

  it('rejects unsupported style properties at runtime', () => {
    const target = {
      backgroundImage: 'url(https://example.test/pixel)'
    } as unknown as MotionTarget;

    expect(() => createDomKeyframes(undefined, target)).toThrow(
      /property "backgroundImage" is not supported/
    );
    expect(() => buildStyleMap(target as MotionResolvedTarget)).toThrow(
      /property "backgroundImage" is not supported/
    );
  });

  it('only allows well-formed CSS custom properties', () => {
    expect(
      buildStyleMap({ '--motion-opacity': 0.8 })
    ).toEqual({ '--motion-opacity': '0.8' });

    const target = {
      '--motion/value': 1
    } as unknown as MotionTarget;

    expect(() => buildStyleMap(target as MotionResolvedTarget)).toThrow(
      /property "--motion\/value" is not supported/
    );
  });
});
