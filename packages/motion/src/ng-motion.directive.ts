import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  Input,
  NgZone,
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
import {
  ANGULAR_MOTION_ANIMATOR,
  ANGULAR_MOTION_CONFIG
} from './provide-angular-motion';
import {
  lastStateTransition,
  mergeTargets,
  mergeVariants,
  resolveMotionPreset,
  resolveMotionState,
  type ResolvedMotionState
} from './state';

type InteractionName =
  | 'animate'
  | 'initial'
  | 'whileFocus'
  | 'whileHover'
  | 'whileInView'
  | 'whileTap';

interface ComposedMotionState {
  target: MotionTarget;
  transition: MotionTransition;
}

type IntersectionObserverConstructor = new (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => IntersectionObserver;

interface IntersectionObserverHost {
  IntersectionObserver?: IntersectionObserverConstructor;
}

@Directive({
  exportAs: 'ngMotion',
  selector: '[ngMotion]',
  standalone: true
})
export class NgMotionDirective implements OnInit, AfterViewInit, OnChanges {
  @Input() initial: MotionStateInput;
  @Input() animate: MotionStateInput;
  @Input() transition: MotionTransition | undefined;
  @Input() whileHover: MotionStateInput;
  @Input() whileTap: MotionStateInput;
  @Input() whileFocus: MotionStateInput;
  @Input() whileInView: MotionStateInput;
  @Input() variants: MotionVariants | undefined;
  @Input() viewport: MotionViewportOptions | undefined;
  @Input() motionPreset: MotionPresetDefinition | string | null | undefined;

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly documentRef = inject(DOCUMENT, { optional: true });
  private readonly config = inject(ANGULAR_MOTION_CONFIG);
  private readonly animator = inject(ANGULAR_MOTION_ANIMATOR);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly cleanups: Array<() => void> = [];
  private activePlayback: AnimationPlayback | undefined;
  private observer: IntersectionObserver | undefined;
  private lastTarget: MotionTarget | undefined;
  private hasView = false;
  private renderQueued = false;
  private hovered = false;
  private pressed = false;
  private focused = false;
  private inView = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanup());
  }

  ngOnInit(): void {
    const initialState = this.resolveNamedState('initial');

    if (initialState !== undefined) {
      this.writeTarget(initialState.target);
      this.lastTarget = initialState.target;
    }
  }

  ngAfterViewInit(): void {
    this.hasView = true;

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

    if (this.isBrowser) {
      this.rebuildInViewObserver();
    }

    this.scheduleRender();
  }

  private get element(): HTMLElement {
    return this.elementRef.nativeElement;
  }

  private cleanup(): void {
    this.activePlayback?.cancel();
    this.observer?.disconnect();
    this.observer = undefined;

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

      this.hovered = true;
      this.scheduleRender();
    });

    this.listen('pointerleave', (event) => {
      if (event.pointerType === 'touch') {
        return;
      }

      this.hovered = false;
      this.pressed = false;
      this.scheduleRender();
    });

    this.listen('pointerdown', (event) => {
      if (event.button !== 0) {
        return;
      }

      this.pressed = true;

      if (typeof this.element.setPointerCapture === 'function') {
        this.element.setPointerCapture(event.pointerId);
      }

      this.scheduleRender();
    });

    this.listen('pointerup', () => {
      this.pressed = false;
      this.scheduleRender();
    });

    this.listen('pointercancel', () => {
      this.pressed = false;
      this.scheduleRender();
    });

    this.listen('focusin', () => {
      this.focused = true;
      this.scheduleRender();
    });

    this.listen('focusout', () => {
      this.focused = false;
      this.scheduleRender();
    });

    this.listen('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
        this.pressed = true;
        this.scheduleRender();
      }
    });

    this.listen('keyup', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        this.pressed = false;
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
    this.observer?.disconnect();
    this.observer = undefined;
    this.inView = false;

    if (this.resolveNamedState('whileInView') === undefined) {
      return;
    }

    const view = this.currentWindow() as IntersectionObserverHost | undefined;
    const Observer = view?.IntersectionObserver;

    if (Observer === undefined) {
      this.inView = true;
      this.scheduleRender();
      return;
    }

    const viewport = this.viewport ?? {};
    const options: IntersectionObserverInit = {
      threshold: this.thresholdFromAmount(viewport.amount)
    };

    if (viewport.margin !== undefined) {
      options.rootMargin = viewport.margin;
    }

    if (viewport.root !== undefined) {
      options.root = viewport.root;
    }

    const observer = new Observer((entries: IntersectionObserverEntry[]) => {
      const intersects = entries.some(
        (entry: IntersectionObserverEntry) =>
          entry.isIntersecting || entry.intersectionRatio > 0
      );

      if (this.inView !== intersects) {
        this.inView = intersects;
        this.scheduleRender();
      }

      if (intersects && viewport.once === true) {
        this.observer?.disconnect();
        this.observer = undefined;
      }
    }, options);

    this.observer = observer;
    observer.observe(this.element);
  }

  private thresholdFromAmount(
    amount: MotionViewportOptions['amount']
  ): number | number[] {
    if (amount === undefined || amount === 'some') {
      return 0;
    }

    if (amount === 'all') {
      return 1;
    }

    return Math.min(Math.max(amount, 0), 1);
  }

  private scheduleRender(): void {
    if (!this.hasView || this.renderQueued) {
      return;
    }

    this.renderQueued = true;
    queueMicrotask(() => {
      this.renderQueued = false;
      this.renderCurrentState();
    });
  }

  private renderCurrentState(): void {
    const composed = this.composeState();

    if (composed === undefined) {
      return;
    }

    const reduceMotion =
      !this.isBrowser ||
      shouldReduceMotion(this.config.reducedMotion, this.currentWindow());

    this.activePlayback?.cancel();

    if (reduceMotion) {
      this.writeTarget(composed.target);
      this.lastTarget = composed.target;
      return;
    }

    this.activePlayback = this.animator.animate(
      this.element,
      this.lastTarget,
      composed.target,
      composed.transition,
      { reducedMotion: reduceMotion }
    );
    this.lastTarget = composed.target;
  }

  private composeState(): ComposedMotionState | undefined {
    const states: ResolvedMotionState[] = [];
    const animateState = this.resolveNamedState('animate');

    if (animateState !== undefined) {
      states.push(animateState);
    }

    if (this.inView) {
      this.pushState(states, 'whileInView');
    }

    if (this.focused) {
      this.pushState(states, 'whileFocus');
    }

    if (this.hovered) {
      this.pushState(states, 'whileHover');
    }

    if (this.pressed) {
      this.pushState(states, 'whileTap');
    }

    if (states.length === 0) {
      return undefined;
    }

    return {
      target: mergeTargets(states),
      transition: this.resolveTransition(states)
    };
  }

  private pushState(states: ResolvedMotionState[], name: InteractionName): void {
    const state = this.resolveNamedState(name);

    if (state !== undefined) {
      states.push(state);
    }
  }

  private resolveTransition(
    states: readonly ResolvedMotionState[]
  ): MotionTransition {
    return (
      lastStateTransition(states) ??
      this.transition ??
      this.resolvePreset()?.transition ??
      this.config.defaultTransition
    );
  }

  private resolveNamedState(name: InteractionName): ResolvedMotionState | undefined {
    const preset = this.resolvePreset();
    const variants = mergeVariants(preset, this.variants);
    const input = this.inputFor(name, preset);

    return resolveMotionState(input, variants, name);
  }

  private inputFor(
    name: InteractionName,
    preset: MotionPresetDefinition | undefined
  ): MotionStateInput {
    const ownInput = this[name];

    if (ownInput !== undefined) {
      return ownInput;
    }

    return preset?.[name];
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
}
