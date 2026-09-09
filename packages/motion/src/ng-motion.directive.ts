import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  Output,
  PLATFORM_ID,
  Renderer2,
  RendererStyleFlags2,
  inject
} from '@angular/core';
import type { AfterViewInit, OnChanges, OnInit } from '@angular/core';
import {
  buildStyleMap,
  resolveFinalTarget,
  shouldReduceMotion,
  type AnimationPlayback,
  type MotionPresetDefinition,
  type MotionStateInput,
  type MotionTarget,
  type MotionTransition,
  type MotionVariants,
  type MotionViewportOptions
} from '@angular-motion/core';
import type {
  MotionAnimationState,
  MotionCancelEvent,
  MotionCancelReason,
  MotionLifecycleEvent,
  MotionTrigger
} from './motion-events';
import {
  isMotionControls,
  type MotionControlCommand,
  type MotionControlState,
  type MotionControls
} from './motion-controls';
import { NgMotionGroupDirective } from './ng-motion-group.directive';
import {
  MotionStateMachine,
  type MotionResolvedSnapshot,
  type MotionStateSlots
} from './motion-state-machine';
import {
  ANGULAR_MOTION_ANIMATOR,
  ANGULAR_MOTION_CONFIG
} from './provide-angular-motion';
import {
  MOTION_PRESENCE_CONTEXT,
  type MotionPresenceParticipant
} from './presence-context';
import {
  mergeVariants,
  resolveMotionPreset,
  resolveMotionState,
  type ResolvedMotionState
} from './state';
import { MotionViewportObserver } from './viewport-observer';

type InputName =
  | 'animate'
  | 'exit'
  | 'initial'
  | 'whileFocus'
  | 'whileHover'
  | 'whileInView'
  | 'whileTap';

interface ActiveAnimation {
  readonly id: number;
  readonly state: MotionAnimationState;
  readonly target: MotionTarget;
  readonly transition: MotionTransition;
  readonly trigger: MotionTrigger;
}

@Directive({
  exportAs: 'ngMotion',
  selector: '[ngMotion]',
  standalone: true
})
export class NgMotionDirective
  implements OnInit, AfterViewInit, OnChanges, MotionPresenceParticipant
{
  @Input() initial: MotionStateInput;
  @Input() animate: MotionStateInput | MotionControls | undefined;
  @Input() exit: MotionStateInput;
  @Input() transition: MotionTransition | undefined;
  @Input() whileHover: MotionStateInput;
  @Input() whileTap: MotionStateInput;
  @Input() whileFocus: MotionStateInput;
  @Input() whileInView: MotionStateInput;
  @Input() variants: MotionVariants | undefined;
  @Input() viewport: MotionViewportOptions | undefined;
  @Input() custom: unknown;
  @Input() motionPreset: MotionPresetDefinition | string | null | undefined;

  @Output() readonly motionStart = new EventEmitter<MotionLifecycleEvent>();
  @Output() readonly motionComplete = new EventEmitter<MotionLifecycleEvent>();
  @Output() readonly motionCancel = new EventEmitter<MotionCancelEvent>();

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly documentRef = inject(DOCUMENT, { optional: true });
  private readonly config = inject(ANGULAR_MOTION_CONFIG);
  private readonly animator = inject(ANGULAR_MOTION_ANIMATOR);
  private readonly viewportObserver = inject(MotionViewportObserver);
  private readonly motionGroup = inject(NgMotionGroupDirective, {
    optional: true,
    skipSelf: true
  });
  private readonly presenceContext = inject(MOTION_PRESENCE_CONTEXT, {
    optional: true
  });
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly cleanups: Array<() => void> = [];
  private readonly stateMachine = new MotionStateMachine();

  private activeAnimation: ActiveAnimation | undefined;
  private activePlayback: AnimationPlayback | undefined;
  private animationGeneration = 0;
  private controlsCleanup: (() => void) | undefined;
  private controlsState: ResolvedMotionState | undefined;
  private boundControls: MotionControls | undefined;
  private viewportCleanup: (() => void) | undefined;
  private groupCleanup: (() => void) | undefined;
  private presenceCleanup: (() => void) | undefined;
  private lastTarget: MotionTarget | undefined;
  private hasView = false;
  private renderQueued = false;
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.cleanup();
    });
  }

  get hostElement(): HTMLElement {
    return this.element;
  }

  ngOnInit(): void {
    const initialState = this.resolveNamedState('initial');

    if (initialState !== undefined) {
      this.stateMachine.markInitial();
      this.writeTarget(initialState.target);
      this.lastTarget = initialState.target;
    }
  }

  ngAfterViewInit(): void {
    this.hasView = true;
    this.groupCleanup = this.motionGroup?.register(this);
    this.presenceCleanup = this.presenceContext?.register(this);
    this.syncControls();

    if (this.isBrowser) {
      this.zone.runOutsideAngular(() => {
        this.bindInteractions();
        this.rebuildInViewObserver();
      });
    }

    this.scheduleRender();
  }

  ngOnChanges(): void {
    if (!this.hasView) {
      return;
    }

    this.syncControls();

    if (this.isBrowser) {
      this.rebuildInViewObserver();
    }

    this.scheduleRender();
  }

  startExitAnimation(): Promise<void> {
    const exitState = this.resolveNamedState('exit');

    if (exitState === undefined) {
      return Promise.resolve();
    }

    this.stateMachine.setExitActive(true);
    const snapshot = this.stateMachine.resolve({ exit: exitState });

    if (snapshot === undefined) {
      return Promise.resolve();
    }

    return this.animateSnapshot(snapshot);
  }

  cancelExit(): void {
    this.stateMachine.setExitActive(false);
    this.cancelActiveAnimation('presence-restored');
    this.scheduleRender();
  }

  private get element(): HTMLElement {
    return this.elementRef.nativeElement;
  }

  private cleanup(): void {
    this.cancelActiveAnimation('destroyed');
    this.viewportCleanup?.();
    this.viewportCleanup = undefined;
    this.groupCleanup?.();
    this.groupCleanup = undefined;
    this.presenceCleanup?.();
    this.presenceCleanup = undefined;
    this.controlsCleanup?.();
    this.controlsCleanup = undefined;
    this.boundControls = undefined;

    for (const cleanup of this.cleanups) {
      cleanup();
    }

    this.cleanups.length = 0;
  }

  private bindInteractions(): void {
    this.listen('pointerenter', (event) => {
      if (event.pointerType === 'touch') {
        return;
      }

      this.stateMachine.setInteraction('hover', true);
      this.scheduleRender();
    });

    this.listen('pointerleave', (event) => {
      if (event.pointerType === 'touch') {
        return;
      }

      this.stateMachine.setInteraction('hover', false);
      this.stateMachine.setInteraction('tap', false);
      this.scheduleRender();
    });

    this.listen('pointerdown', (event) => {
      if (event.button !== 0) {
        return;
      }

      this.stateMachine.setInteraction('tap', true);

      if (typeof this.element.setPointerCapture === 'function') {
        this.element.setPointerCapture(event.pointerId);
      }

      this.scheduleRender();
    });

    this.listen('pointerup', () => {
      this.stateMachine.setInteraction('tap', false);
      this.scheduleRender();
    });

    this.listen('pointercancel', () => {
      this.stateMachine.setInteraction('tap', false);
      this.scheduleRender();
    });

    this.listen('focusin', () => {
      this.stateMachine.setInteraction('focus', true);
      this.scheduleRender();
    });

    this.listen('focusout', () => {
      this.stateMachine.setInteraction('focus', false);
      this.scheduleRender();
    });

    this.listen('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
        this.stateMachine.setInteraction('tap', true);
        this.scheduleRender();
      }
    });

    this.listen('keyup', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        this.stateMachine.setInteraction('tap', false);
        this.scheduleRender();
      }
    });
  }

  private listen<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void
  ): void {
    const eventListener: EventListener = (event) =>
      listener(event as HTMLElementEventMap[K]);

    this.element.addEventListener(type, eventListener);
    this.cleanups.push(() => this.element.removeEventListener(type, eventListener));
  }

  private rebuildInViewObserver(): void {
    this.viewportCleanup?.();
    this.viewportCleanup = undefined;
    this.stateMachine.setInteraction('inView', false);

    if (this.resolveNamedState('whileInView') === undefined) {
      return;
    }

    this.viewportCleanup = this.viewportObserver.observe(
      this.element,
      this.viewport,
      (entry) => {
        this.stateMachine.setInteraction('inView', entry.inView);
        this.scheduleRender();
      }
    );
  }

  private syncControls(): void {
    const controls = isMotionControls(this.animate) ? this.animate : undefined;

    if (controls === this.boundControls) {
      return;
    }

    this.controlsCleanup?.();
    this.controlsCleanup = undefined;
    this.boundControls = controls;
    this.controlsState = undefined;
    this.stateMachine.setControlsActive(false);

    if (controls !== undefined) {
      this.controlsCleanup = controls.subscribe((command) =>
        this.handleControlCommand(command)
      );
    }
  }

  private handleControlCommand(command: MotionControlCommand): void {
    switch (command.type) {
      case 'start': {
        this.controlsState = this.resolveControlState(
          command.state,
          command.transition
        );
        this.stateMachine.setControlsActive(true);
        this.scheduleRender();
        return;
      }
      case 'set': {
        const state = this.resolveControlState(command.state);
        this.stateMachine.setControlsActive(false);
        this.controlsState = undefined;
        this.cancelActiveAnimation('imperative-stop');
        this.applyImmediateTarget(state.target, state.transition, 'controls');
        return;
      }
      case 'stop':
        this.controlsState = undefined;
        this.stateMachine.setControlsActive(false);
        this.cancelActiveAnimation('imperative-stop');
        this.scheduleRender();
        return;
    }
  }

  private resolveControlState(
    state: MotionControlState,
    transition: MotionTransition | undefined = undefined
  ): ResolvedMotionState {
    const resolved = resolveMotionState(
      state,
      this.currentVariants(),
      'controls',
      this.custom
    );

    if (resolved === undefined) {
      throw new Error('Imperative motion controls require a target state.');
    }

    return transition === undefined
      ? resolved
      : { ...resolved, transition };
  }

  private scheduleRender(): void {
    if (!this.hasView || this.renderQueued || this.destroyed) {
      return;
    }

    this.renderQueued = true;
    queueMicrotask(() => {
      this.renderQueued = false;

      if (!this.destroyed) {
        void this.renderCurrentState();
      }
    });
  }

  private renderCurrentState(): Promise<void> | undefined {
    const snapshot = this.composeSnapshot();

    if (snapshot === undefined) {
      return undefined;
    }

    return this.animateSnapshot(snapshot);
  }

  private composeSnapshot(): MotionResolvedSnapshot | undefined {
    const slots: MotionStateSlots = {};
    this.assignSlot(slots, 'animate', this.resolveNamedState('animate'));
    this.assignSlot(slots, 'controls', this.controlsState);
    this.assignSlot(slots, 'exit', this.resolveNamedState('exit'));
    this.assignSlot(slots, 'whileFocus', this.resolveNamedState('whileFocus'));
    this.assignSlot(slots, 'whileHover', this.resolveNamedState('whileHover'));
    this.assignSlot(slots, 'whileInView', this.resolveNamedState('whileInView'));
    this.assignSlot(slots, 'whileTap', this.resolveNamedState('whileTap'));

    return this.stateMachine.resolve(slots);
  }

  private assignSlot(
    slots: MotionStateSlots,
    name: keyof MotionStateSlots,
    state: ResolvedMotionState | undefined
  ): void {
    if (state !== undefined) {
      slots[name] = state;
    }
  }

  private animateSnapshot(snapshot: MotionResolvedSnapshot): Promise<void> {
    const transition = this.resolveTransition(snapshot);
    const reduceMotion =
      !this.isBrowser ||
      shouldReduceMotion(this.config.reducedMotion, this.currentWindow());

    this.cancelActiveAnimation('replaced');

    if (reduceMotion) {
      this.applyImmediateTarget(
        snapshot.target,
        transition,
        snapshot.trigger,
        snapshot.state
      );
      return Promise.resolve();
    }

    const id = this.nextAnimationId();
    const activeAnimation: ActiveAnimation = {
      id,
      state: snapshot.state,
      target: snapshot.target,
      transition,
      trigger: snapshot.trigger
    };

    this.activeAnimation = activeAnimation;
    this.stateMachine.markAnimating(snapshot.state);
    this.emitStart(activeAnimation);

    const playback = this.animator.animate(
      this.element,
      this.lastTarget,
      snapshot.target,
      transition,
      { reducedMotion: false }
    );
    this.activePlayback = playback;
    this.lastTarget = snapshot.target;

    return playback.finished.then(
      () => {
        if (!this.isCurrentAnimation(id)) {
          return;
        }

        playback.commitStyles();
        this.activePlayback = undefined;
        this.activeAnimation = undefined;
        this.stateMachine.markCompleted();
        this.emitComplete(activeAnimation);
      },
      (error: unknown) => {
        if (!this.isCurrentAnimation(id)) {
          return;
        }

        this.activePlayback = undefined;
        this.activeAnimation = undefined;
        throw error;
      }
    );
  }

  private applyImmediateTarget(
    target: MotionTarget,
    transition: MotionTransition | undefined,
    trigger: MotionTrigger,
    state: MotionAnimationState = 'completed'
  ): void {
    const resolvedTransition =
      transition ??
      this.transition ??
      this.resolvePreset()?.transition ??
      this.config.defaultTransition;
    const activeAnimation: ActiveAnimation = {
      id: this.nextAnimationId(),
      state,
      target,
      transition: resolvedTransition,
      trigger
    };

    this.emitStart(activeAnimation);
    this.writeTarget(target);
    this.lastTarget = target;
    this.stateMachine.markCompleted();
    this.emitComplete({ ...activeAnimation, state: 'completed' });
  }

  private cancelActiveAnimation(reason: MotionCancelReason): void {
    const playback = this.activePlayback;
    const activeAnimation = this.activeAnimation;

    if (playback === undefined || activeAnimation === undefined) {
      return;
    }

    this.nextAnimationId();
    playback.commitStyles();
    playback.cancel();
    this.activePlayback = undefined;
    this.activeAnimation = undefined;
    this.stateMachine.markCancelled();
    this.emitCancel(activeAnimation, reason);
  }

  private resolveTransition(snapshot: MotionResolvedSnapshot): MotionTransition {
    const baseTransition =
      snapshot.transition ??
      this.transition ??
      this.resolvePreset()?.transition ??
      this.config.defaultTransition;
    const staggerDelay = this.motionGroup?.delayFor(this) ?? 0;

    if (staggerDelay === 0) {
      return baseTransition;
    }

    return {
      ...baseTransition,
      delay: (baseTransition.delay ?? 0) + staggerDelay
    };
  }

  private resolveNamedState(name: InputName): ResolvedMotionState | undefined {
    const input = this.inputFor(name);

    return resolveMotionState(
      input,
      this.currentVariants(),
      name,
      this.custom
    );
  }

  private inputFor(name: InputName): MotionStateInput {
    const preset = this.resolvePreset();

    switch (name) {
      case 'animate':
        return isMotionControls(this.animate)
          ? preset?.animate
          : this.animate ?? preset?.animate;
      case 'exit':
        return this.exit ?? preset?.exit;
      case 'initial':
        return this.initial ?? preset?.initial;
      case 'whileFocus':
        return this.whileFocus ?? preset?.whileFocus;
      case 'whileHover':
        return this.whileHover ?? preset?.whileHover;
      case 'whileInView':
        return this.whileInView ?? preset?.whileInView;
      case 'whileTap':
        return this.whileTap ?? preset?.whileTap;
    }
  }

  private currentVariants(): MotionVariants {
    return mergeVariants(this.resolvePreset(), this.variants);
  }

  private resolvePreset(): MotionPresetDefinition | undefined {
    return resolveMotionPreset(this.motionPreset, this.config.presets);
  }

  private writeTarget(target: MotionTarget): void {
    const styles = buildStyleMap(resolveFinalTarget(target));

    for (const [property, value] of Object.entries(styles)) {
      this.renderer.setStyle(
        this.element,
        property,
        value,
        RendererStyleFlags2.DashCase
      );
    }
  }

  private currentWindow(): Window | undefined {
    return (
      this.element.ownerDocument?.defaultView ??
      this.documentRef?.defaultView ??
      undefined
    );
  }

  private emitStart(event: ActiveAnimation): void {
    this.emit(this.motionStart, this.lifecycleEvent(event, event.state));
  }

  private emitComplete(event: ActiveAnimation): void {
    this.emit(this.motionComplete, this.lifecycleEvent(event, 'completed'));
  }

  private emitCancel(event: ActiveAnimation, reason: MotionCancelReason): void {
    this.emit(this.motionCancel, {
      ...this.lifecycleEvent(event, 'cancelled'),
      reason
    });
  }

  private lifecycleEvent(
    event: ActiveAnimation,
    state: MotionAnimationState
  ): MotionLifecycleEvent {
    return {
      element: this.element,
      state,
      target: event.target,
      timestamp: this.timestamp(),
      transition: event.transition,
      trigger: event.trigger
    };
  }

  private emit<TEvent>(
    emitter: EventEmitter<TEvent>,
    event: TEvent
  ): void {
    this.zone.run(() => emitter.emit(event));
  }

  private nextAnimationId(): number {
    this.animationGeneration += 1;
    return this.animationGeneration;
  }

  private isCurrentAnimation(id: number): boolean {
    return !this.destroyed && this.animationGeneration === id;
  }

  private timestamp(): number {
    return this.currentWindow()?.performance?.now() ?? Date.now();
  }
}
