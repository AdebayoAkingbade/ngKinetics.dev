import { describe, expect, it } from 'vitest';
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
});
