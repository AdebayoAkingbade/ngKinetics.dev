import { createDomKeyframes } from '../rendering/styles';
import type { MotionTarget, MotionTransition } from '../animation/types';

export interface MotionBenchmarkSample {
  readonly nodes: number;
  readonly keyframesCreated: number;
  readonly scriptTimeMs: number;
}

export interface MotionBenchmarkOptions {
  readonly counts?: readonly number[];
  readonly from?: MotionTarget;
  readonly to?: MotionTarget;
  readonly transition?: MotionTransition;
}

function timestamp(): number {
  return globalThis.performance?.now() ?? Date.now();
}

export function benchmarkKeyframeSerialization(
  options: MotionBenchmarkOptions = {}
): MotionBenchmarkSample[] {
  const counts = options.counts ?? [100, 500, 1000];
  const from = options.from ?? { opacity: 0, y: 24 };
  const to = options.to ?? { opacity: 1, y: 0 };

  return counts.map((nodes) => {
    if (!Number.isInteger(nodes) || nodes < 0) {
      throw new Error('Benchmark node counts must be non-negative integers.');
    }

    const start = timestamp();
    let keyframesCreated = 0;

    for (let index = 0; index < nodes; index += 1) {
      keyframesCreated += createDomKeyframes(
        from,
        to,
        options.transition
      ).length;
    }

    return {
      keyframesCreated,
      nodes,
      scriptTimeMs: timestamp() - start
    };
  });
}
