import { describe, expect, it } from 'vitest';
import { MotionStateMachine } from './motion-state-machine';

describe('MotionStateMachine', () => {
  it('resolves hover, tap, and return-to-hover deterministically', () => {
    const machine = new MotionStateMachine();
    const slots = {
      animate: { target: { scale: 1 } },
      whileHover: { target: { scale: 1.05 } },
      whileTap: { target: { scale: 0.95 } }
    };

    expect(machine.resolve(slots)?.target).toEqual({ scale: 1 });

    machine.setInteraction('hover', true);
    expect(machine.resolve(slots)).toMatchObject({
      target: { scale: 1.05 },
      trigger: 'hover'
    });

    machine.setInteraction('tap', true);
    expect(machine.resolve(slots)).toMatchObject({
      target: { scale: 0.95 },
      trigger: 'tap'
    });

    machine.setInteraction('tap', false);
    expect(machine.resolve(slots)).toMatchObject({
      target: { scale: 1.05 },
      trigger: 'hover'
    });

    machine.setInteraction('hover', false);
    expect(machine.resolve(slots)).toMatchObject({
      target: { scale: 1 },
      trigger: 'animate'
    });
  });

  it('gives exit final precedence over other active states', () => {
    const machine = new MotionStateMachine();
    machine.setInteraction('hover', true);
    machine.setExitActive(true);

    expect(
      machine.resolve({
        animate: { target: { opacity: 1 } },
        exit: { target: { opacity: 0 } },
        whileHover: { target: { scale: 1.05 } }
      })
    ).toMatchObject({
      state: 'exiting',
      target: { opacity: 0 },
      trigger: 'exit'
    });
  });
});
