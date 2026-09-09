import { describe, expect, it } from 'vitest';
import { benchmarkKeyframeSerialization } from './animation-benchmark';

describe('benchmarkKeyframeSerialization', () => {
  it('creates keyframe serialization samples for configured node counts', () => {
    expect(benchmarkKeyframeSerialization({ counts: [2] })[0]).toMatchObject({
      keyframesCreated: 4,
      nodes: 2
    });
  });
});
