import type { MotionTarget, MotionTransition } from '@angular-motion/core';
import {
  lastStateTransition,
  mergeTargets,
  type ResolvedMotionState
} from './state';
import type { MotionAnimationState, MotionTrigger } from './motion-events';

export type MotionInteraction = 'focus' | 'hover' | 'inView' | 'tap';
export type MotionStateSlot =
  | 'animate'
  | 'controls'
  | 'exit'
  | 'whileFocus'
  | 'whileHover'
  | 'whileInView'
  | 'whileTap';

export type MotionStateSlots = Partial<Record<MotionStateSlot, ResolvedMotionState>>;

export interface MotionResolvedSnapshot {
  readonly target: MotionTarget;
  readonly transition?: MotionTransition;
  readonly trigger: MotionTrigger;
  readonly state: MotionAnimationState;
}

const interactionSlots = [
  ['inView', 'whileInView', 'inView', 'inView'],
  ['focus', 'whileFocus', 'focus', 'focus'],
  ['hover', 'whileHover', 'hover', 'hover'],
  ['tap', 'whileTap', 'tap', 'tap']
] as const satisfies readonly [
  MotionInteraction,
  MotionStateSlot,
  MotionTrigger,
  MotionAnimationState
][];

export class MotionStateMachine {
  private readonly activeInteractions: Record<MotionInteraction, boolean> = {
    focus: false,
    hover: false,
    inView: false,
    tap: false
  };
  private phase: MotionAnimationState = 'idle';
  private controlsActive = false;
  private exitActive = false;

  currentState(): MotionAnimationState {
    return this.phase;
  }

  setInteraction(interaction: MotionInteraction, active: boolean): void {
    this.activeInteractions[interaction] = active;
  }

  setControlsActive(active: boolean): void {
    this.controlsActive = active;
  }

  setExitActive(active: boolean): void {
    this.exitActive = active;
  }

  markInitial(): void {
    this.phase = 'initial';
  }

  markAnimating(state: MotionAnimationState): void {
    this.phase = state;
  }

  markCompleted(): void {
    this.phase = 'completed';
  }

  markCancelled(): void {
    this.phase = 'cancelled';
  }

  resetInteractions(): void {
    this.activeInteractions.focus = false;
    this.activeInteractions.hover = false;
    this.activeInteractions.inView = false;
    this.activeInteractions.tap = false;
  }

  resolve(slots: MotionStateSlots): MotionResolvedSnapshot | undefined {
    if (this.exitActive) {
      return slots.exit === undefined
        ? undefined
        : this.snapshot([slots.exit], 'exit', 'exiting');
    }

    const states: ResolvedMotionState[] = [];
    let trigger: MotionTrigger = 'animate';
    let state: MotionAnimationState = 'animating';

    if (slots.animate !== undefined) {
      states.push(slots.animate);
    }

    for (const [interaction, slotName, interactionTrigger, interactionState] of interactionSlots) {
      const slot = slots[slotName];

      if (this.activeInteractions[interaction] && slot !== undefined) {
        states.push(slot);
        trigger = interactionTrigger;
        state = interactionState;
      }
    }

    if (this.controlsActive && slots.controls !== undefined) {
      states.push(slots.controls);
      trigger = 'controls';
      state = 'animating';
    }

    if (states.length === 0) {
      return undefined;
    }

    return this.snapshot(states, trigger, state);
  }

  private snapshot(
    states: readonly ResolvedMotionState[],
    trigger: MotionTrigger,
    state: MotionAnimationState
  ): MotionResolvedSnapshot {
    const transition = lastStateTransition(states);

    if (transition === undefined) {
      return {
        state,
        target: mergeTargets(states),
        trigger
      };
    }

    return {
      state,
      target: mergeTargets(states),
      transition,
      trigger
    };
  }
}
