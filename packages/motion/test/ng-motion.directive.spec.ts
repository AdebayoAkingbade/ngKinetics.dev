import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
  MotionStateInput,
  MotionTarget,
  MotionTransition,
  MotionVariants,
  MotionViewportOptions
} from '@angular-motion/core';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import type {
  MotionCancelEvent,
  MotionLifecycleEvent
} from '../src/motion-events';
import {
  motionControls,
  type MotionControls
} from '../src/motion-controls';
import { NgMotionDirective } from '../src/ng-motion.directive';
import { NgMotionGroupDirective } from '../src/ng-motion-group.directive';
import { NgMotionPresenceComponent } from '../src/ng-motion-presence.component';
import { provideAngularMotion } from '../src/provide-angular-motion';

interface AnimateCall {
  element: HTMLElement;
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null;
  options: number | KeyframeAnimationOptions | undefined;
}

class FakeAnimation {
  playState: AnimationPlayState = 'running';
  readonly cancel = vi.fn(() => {
    this.playState = 'idle';
    this.resolveFinished(this.asAnimation());
  });
  readonly commitStyles = vi.fn();
  readonly finished: Promise<Animation>;
  private resolveFinished!: (animation: Animation) => void;
  private rejectFinished!: (error: unknown) => void;

  constructor() {
    this.finished = new Promise<Animation>((resolve, reject) => {
      this.resolveFinished = resolve;
      this.rejectFinished = reject;
    });
  }

  resolve(): void {
    this.playState = 'finished';
    this.resolveFinished(this.asAnimation());
  }

  reject(error: unknown): void {
    this.playState = 'idle';
    this.rejectFinished(error);
  }

  private asAnimation(): Animation {
    return this as unknown as Animation;
  }
}

type ObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver
) => void;

class FakeIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly scrollMargin = '0px';
  readonly thresholds: readonly number[];
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  constructor(
    private readonly callback: ObserverCallback,
    options: IntersectionObserverInit = {}
  ) {
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? '0px';
    this.thresholds = Array.isArray(options.threshold)
      ? options.threshold
      : [options.threshold ?? 0];
    fakeObservers.push(this);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(entry: Partial<IntersectionObserverEntry>): void {
    this.callback([entry as IntersectionObserverEntry], this);
  }
}

@Component({
  imports: [NgMotionDirective],
  standalone: true,
  template: `
    <div
      id="box"
      ngMotion
      [initial]="initial"
      [animate]="animate"
      [exit]="exit"
      [transition]="transition"
      [whileHover]="whileHover"
      [whileTap]="whileTap"
      [whileFocus]="whileFocus"
      [whileInView]="whileInView"
      [variants]="variants"
      [viewport]="viewport"
      [custom]="custom"
      [motionPreset]="motionPreset"
      (motionStart)="starts.push($event)"
      (motionComplete)="completes.push($event)"
      (motionCancel)="cancels.push($event)">
      Motion
    </div>
  `
})
class MotionHostComponent {
  initial: MotionStateInput = { opacity: 0, y: 40 };
  animate: MotionStateInput | MotionControls | undefined = {
    opacity: 1,
    y: 0
  };
  exit: MotionStateInput;
  transition: MotionTransition | undefined = { duration: 0.4, ease: 'out' };
  whileHover: MotionStateInput;
  whileTap: MotionStateInput;
  whileFocus: MotionStateInput;
  whileInView: MotionStateInput;
  variants: MotionVariants | undefined;
  viewport: MotionViewportOptions | undefined;
  custom: unknown;
  motionPreset: string | undefined;
  starts: MotionLifecycleEvent[] = [];
  completes: MotionLifecycleEvent[] = [];
  cancels: MotionCancelEvent[] = [];
}

@Component({
  imports: [NgMotionDirective, NgMotionGroupDirective],
  standalone: true,
  template: `
    <div ngMotionGroup [stagger]="stagger" [staggerDirection]="direction">
      @for (item of items(); track item) {
        <div
          class="item"
          ngMotion
          [initial]="false"
          [animate]="target"
          [transition]="transition">
          {{ item }}
        </div>
      }
    </div>
  `
})
class StaggerHostComponent {
  items = signal([1, 2, 3]);
  stagger = 0.08;
  direction: 'forward' | 'reverse' = 'forward';
  target: MotionTarget = { opacity: 1 };
  transition: MotionTransition = { duration: 0.2 };
}

@Component({
  imports: [NgMotionDirective],
  standalone: true,
  template: `
    <div
      class="watch"
      ngMotion
      [initial]="false"
      [animate]="{ opacity: 0 }"
      [whileInView]="{ opacity: 1 }"
      [viewport]="viewport">
    </div>
    <div
      class="watch"
      ngMotion
      [initial]="false"
      [animate]="{ opacity: 0 }"
      [whileInView]="{ opacity: 1 }"
      [viewport]="viewport">
    </div>
  `
})
class ViewportHostComponent {
  viewport: MotionViewportOptions = {
    amount: 0.5,
    margin: '0px',
    once: true
  };
}

@Component({
  imports: [NgMotionDirective, NgMotionPresenceComponent],
  standalone: true,
  template: `
    <ng-motion-presence [present]="shown()">
      <ng-template>
        <div
          id="panel"
          ngMotion
          [initial]="{ opacity: 0, scale: 0.95 }"
          [animate]="{ opacity: 1, scale: 1 }"
          [exit]="{ opacity: 0, scale: 0.95 }"
          [transition]="{ duration: 0.25 }"
          (motionCancel)="cancels.push($event)">
          Panel
        </div>
      </ng-template>
    </ng-motion-presence>
  `
})
class PresenceHostComponent {
  shown = signal(true);
  cancels: MotionCancelEvent[] = [];
}

const animateCalls: AnimateCall[] = [];
const fakeAnimations: FakeAnimation[] = [];
const fakeObservers: FakeIntersectionObserver[] = [];

const originalAnimate = HTMLElement.prototype.animate;
const originalIntersectionObserver = window.IntersectionObserver;

function boxElement(): HTMLElement {
  const box = document.querySelector<HTMLElement>('#box');

  if (box === null) {
    throw new Error('Expected #box to be rendered.');
  }

  return box;
}

function panelElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#panel');
}

function pointerEvent(type: string, pointerType = 'mouse'): PointerEvent {
  const event = new Event(type) as PointerEvent;
  Object.defineProperty(event, 'button', { value: 0 });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}

function keyboardEvent(type: string, key: string): KeyboardEvent {
  const event = new Event(type) as KeyboardEvent;
  Object.defineProperty(event, 'key', { value: key });
  Object.defineProperty(event, 'repeat', { value: false });
  return event;
}

async function flushMotion(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function lastAnimation(): FakeAnimation {
  const animation = fakeAnimations.at(-1);

  if (animation === undefined) {
    throw new Error('Expected an animation to be started.');
  }

  return animation;
}

function lastCall(): AnimateCall {
  const call = animateCalls.at(-1);

  if (call === undefined) {
    throw new Error('Expected an animation call.');
  }

  return call;
}

describe('NgMotionDirective', () => {
  beforeEach(() => {
    animateCalls.length = 0;
    fakeAnimations.length = 0;
    fakeObservers.length = 0;

    HTMLElement.prototype.animate = function animate(
      this: HTMLElement,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions
    ): Animation {
      const animation = new FakeAnimation();
      animateCalls.push({ element: this, keyframes, options });
      fakeAnimations.push(animation);
      return animation as unknown as Animation;
    };

    window.IntersectionObserver = FakeIntersectionObserver;
  });

  afterEach(() => {
    HTMLElement.prototype.animate = originalAnimate;
    window.IntersectionObserver = originalIntersectionObserver;
    TestBed.resetTestingModule();
  });

  it('writes initial styles and animates to the animate state', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.detectChanges();

    expect(boxElement().style.opacity).toBe('0');
    expect(boxElement().style.transform).toBe('translateY(40px)');

    await flushMotion();

    expect(animateCalls).toHaveLength(1);
    expect(lastCall().keyframes).toEqual([
      { opacity: '0', transform: 'translateY(40px)' },
      { opacity: '1', transform: 'translateY(0px)' }
    ]);
    expect(lastCall().options).toMatchObject({
      duration: 400,
      easing: 'cubic-bezier(0, 0, 0.2, 1)'
    });
    expect(fixture.componentInstance.starts.at(-1)?.trigger).toBe('animate');

    lastAnimation().resolve();
    await flushMotion();

    expect(fixture.componentInstance.completes.at(-1)?.state).toBe('completed');
  });

  it('resolves inline and dynamic variants without mutating variant objects', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    const visible = {
      opacity: 1,
      transition: { duration: 0.2, ease: 'linear' },
      y: 0
    };
    fixture.componentInstance.initial = 'hidden';
    fixture.componentInstance.animate = 'visible';
    fixture.componentInstance.custom = 3;
    fixture.componentInstance.variants = {
      hidden: { opacity: 0, y: 20 },
      visible: (index: unknown) => ({
        ...visible,
        transition: { duration: 0.2, delay: Number(index) * 0.05 }
      })
    };
    fixture.detectChanges();
    await flushMotion();

    expect(lastCall().keyframes).toEqual([
      { opacity: '0', transform: 'translateY(20px)' },
      { opacity: '1', transform: 'translateY(0px)' }
    ]);
    expect(lastCall().options).toMatchObject({ duration: 200 });
    expect((lastCall().options as KeyframeAnimationOptions).delay).toBeCloseTo(
      150
    );
    expect(visible).toEqual({
      opacity: 1,
      transition: { duration: 0.2, ease: 'linear' },
      y: 0
    });
  });

  it('uses state transition before local and global transitions', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [
        provideAngularMotion({
          defaultTransition: { duration: 0.9, ease: 'linear' }
        })
      ]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.componentInstance.initial = false;
    fixture.componentInstance.transition = { duration: 0.6 };
    fixture.componentInstance.animate = 'visible';
    fixture.componentInstance.variants = {
      visible: {
        opacity: 1,
        transition: { duration: 0.15, ease: 'in' }
      }
    };
    fixture.detectChanges();
    await flushMotion();

    expect(lastCall().options).toMatchObject({
      duration: 150,
      easing: 'cubic-bezier(0.4, 0, 1, 1)'
    });
  });

  it('composes hover and tap state precedence deterministically', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.componentInstance.initial = false;
    fixture.componentInstance.animate = { scale: 1 };
    fixture.componentInstance.whileHover = { scale: 1.05 };
    fixture.componentInstance.whileTap = { scale: 0.95 };
    fixture.detectChanges();
    await flushMotion();

    const box = boxElement();
    box.dispatchEvent(pointerEvent('pointerenter'));
    await flushMotion();

    expect(lastCall().keyframes).toEqual([
      { transform: 'scale(1)' },
      { transform: 'scale(1.05)' }
    ]);

    box.dispatchEvent(pointerEvent('pointerdown'));
    await flushMotion();

    expect(lastCall().keyframes).toEqual([
      { transform: 'scale(1.05)' },
      { transform: 'scale(0.95)' }
    ]);

    box.dispatchEvent(pointerEvent('pointerup'));
    await flushMotion();

    expect(lastCall().keyframes).toEqual([
      { transform: 'scale(0.95)' },
      { transform: 'scale(1.05)' }
    ]);

    box.dispatchEvent(pointerEvent('pointerleave'));
    await flushMotion();

    expect(lastCall().keyframes).toEqual([
      { transform: 'scale(1.05)' },
      { transform: 'scale(1)' }
    ]);
  });

  it('supports keyboard press and focus interaction states', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.componentInstance.initial = false;
    fixture.componentInstance.animate = { scale: 1 };
    fixture.componentInstance.whileFocus = { scale: 1.03 };
    fixture.componentInstance.whileTap = { scale: 0.97 };
    fixture.detectChanges();
    await flushMotion();

    const box = boxElement();
    box.dispatchEvent(new Event('focusin'));
    await flushMotion();

    expect(lastCall().keyframes).toEqual([
      { transform: 'scale(1)' },
      { transform: 'scale(1.03)' }
    ]);

    box.dispatchEvent(keyboardEvent('keydown', 'Enter'));
    await flushMotion();

    expect(lastCall().keyframes).toEqual([
      { transform: 'scale(1.03)' },
      { transform: 'scale(0.97)' }
    ]);

    box.dispatchEvent(keyboardEvent('keyup', 'Enter'));
    await flushMotion();

    expect(lastCall().keyframes).toEqual([
      { transform: 'scale(0.97)' },
      { transform: 'scale(1.03)' }
    ]);
  });

  it('cancels replaced animations and ignores stale completions', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.componentInstance.initial = { x: 0 };
    fixture.componentInstance.animate = { x: 500 };
    fixture.detectChanges();
    await flushMotion();

    const firstAnimation = lastAnimation();
    fixture.componentInstance.animate = { x: 200 };
    fixture.detectChanges();
    await flushMotion();

    expect(firstAnimation.cancel).toHaveBeenCalled();
    expect(fixture.componentInstance.cancels.at(-1)?.reason).toBe('replaced');

    firstAnimation.resolve();
    await flushMotion();

    expect(fixture.componentInstance.completes).toHaveLength(0);

    lastAnimation().resolve();
    await flushMotion();

    expect(fixture.componentInstance.completes).toHaveLength(1);
    expect(fixture.componentInstance.completes[0]?.target).toEqual({ x: 200 });
  });

  it('emits typed cancellation events on imperative stop', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const controls = motionControls();
    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.componentInstance.initial = false;
    fixture.componentInstance.animate = controls;
    fixture.detectChanges();
    await flushMotion();

    controls.start({ opacity: 1, x: 100 }, { duration: 0.2 });
    await flushMotion();

    expect(lastCall().options).toMatchObject({ duration: 200 });
    expect(fixture.componentInstance.starts.at(-1)?.trigger).toBe('controls');

    controls.stop();
    await flushMotion();

    expect(lastAnimation().cancel).toHaveBeenCalled();
    expect(fixture.componentInstance.cancels.at(-1)).toMatchObject({
      reason: 'imperative-stop',
      trigger: 'controls'
    });
  });

  it('sets imperative targets immediately without starting WAAPI', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const controls = motionControls();
    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.componentInstance.initial = false;
    fixture.componentInstance.animate = controls;
    fixture.detectChanges();
    await flushMotion();

    expect(animateCalls).toHaveLength(0);

    controls.set({ opacity: 0.4, x: 12 });
    await flushMotion();

    expect(animateCalls).toHaveLength(0);
    expect(boxElement().style.opacity).toBe('0.4');
    expect(boxElement().style.transform).toBe('translateX(12px)');
    expect(fixture.componentInstance.completes.at(-1)?.trigger).toBe('controls');
  });

  it('passes keyframes and keyframe transition offsets to WAAPI', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.componentInstance.initial = false;
    fixture.componentInstance.animate = {
      opacity: [0, 1],
      scale: [1, 1.2, 0.95, 1]
    };
    fixture.componentInstance.transition = {
      duration: 1,
      ease: ['out', 'linear', 'in'],
      times: [0, 0.4, 0.75, 1]
    };
    fixture.detectChanges();
    await flushMotion();

    expect(lastCall().keyframes).toEqual([
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

  it('applies final styles and lifecycle events when reduced motion is enabled', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion({ reducedMotion: 'always' })]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.detectChanges();
    await flushMotion();

    expect(animateCalls).toHaveLength(0);
    expect(boxElement().style.opacity).toBe('1');
    expect(boxElement().style.transform).toBe('translateY(0px)');
    expect(fixture.componentInstance.starts.at(-1)?.state).toBe('animating');
    expect(fixture.componentInstance.completes.at(-1)?.state).toBe('completed');
  });
});

describe('NgMotionGroupDirective', () => {
  beforeEach(() => {
    animateCalls.length = 0;
    fakeAnimations.length = 0;

    HTMLElement.prototype.animate = function animate(
      this: HTMLElement,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions
    ): Animation {
      const animation = new FakeAnimation();
      animateCalls.push({ element: this, keyframes, options });
      fakeAnimations.push(animation);
      return animation as unknown as Animation;
    };
  });

  afterEach(() => {
    HTMLElement.prototype.animate = originalAnimate;
    TestBed.resetTestingModule();
  });

  it('adds deterministic stagger delays to child animations', async () => {
    TestBed.configureTestingModule({
      imports: [StaggerHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(StaggerHostComponent);
    fixture.detectChanges();
    await flushMotion();

    expect(animateCalls.map((call) => call.options)).toEqual([
      expect.objectContaining({ delay: 0 }),
      expect.objectContaining({ delay: 80 }),
      expect.objectContaining({ delay: 160 })
    ]);
  });

  it('supports reverse stagger and dynamic child addition', async () => {
    TestBed.configureTestingModule({
      imports: [StaggerHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(StaggerHostComponent);
    fixture.componentInstance.items.set([1, 2]);
    fixture.componentInstance.direction = 'reverse';
    fixture.detectChanges();
    await flushMotion();

    expect(animateCalls.map((call) => call.options)).toEqual([
      expect.objectContaining({ delay: 80 }),
      expect.objectContaining({ delay: 0 })
    ]);

    animateCalls.length = 0;
    fixture.componentInstance.items.set([1, 2, 3]);
    fixture.detectChanges();
    await flushMotion();

    expect(animateCalls.at(-1)?.options).toEqual(
      expect.objectContaining({ delay: 0 })
    );
  });
});

describe('MotionViewportObserver integration', () => {
  beforeEach(() => {
    animateCalls.length = 0;
    fakeAnimations.length = 0;
    fakeObservers.length = 0;

    HTMLElement.prototype.animate = function animate(
      this: HTMLElement,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions
    ): Animation {
      const animation = new FakeAnimation();
      animateCalls.push({ element: this, keyframes, options });
      fakeAnimations.push(animation);
      return animation as unknown as Animation;
    };

    window.IntersectionObserver = FakeIntersectionObserver;
  });

  afterEach(() => {
    HTMLElement.prototype.animate = originalAnimate;
    window.IntersectionObserver = originalIntersectionObserver;
    TestBed.resetTestingModule();
  });

  it('shares compatible IntersectionObserver instances and supports once', async () => {
    TestBed.configureTestingModule({
      imports: [ViewportHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(ViewportHostComponent);
    fixture.detectChanges();
    await flushMotion();

    expect(fakeObservers).toHaveLength(1);
    expect(fakeObservers[0]?.thresholds).toEqual([0.5]);
    expect(fakeObservers[0]?.observe).toHaveBeenCalledTimes(2);

    const target = document.querySelector('.watch');

    if (target === null) {
      throw new Error('Expected viewport target.');
    }

    fakeObservers[0]?.trigger({
      intersectionRatio: 0.6,
      isIntersecting: true,
      target
    });
    await flushMotion();

    expect(fakeObservers[0]?.unobserve).toHaveBeenCalledWith(target);
  });

  it('throws useful errors for invalid viewport amounts', () => {
    TestBed.configureTestingModule({
      imports: [ViewportHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(ViewportHostComponent);
    fixture.componentInstance.viewport = { amount: 2 };

    expect(() => fixture.detectChanges()).toThrow(
      /viewport amount must be/
    );
  });
});

describe('NgMotionPresenceDirective', () => {
  beforeEach(() => {
    animateCalls.length = 0;
    fakeAnimations.length = 0;

    HTMLElement.prototype.animate = function animate(
      this: HTMLElement,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions
    ): Animation {
      const animation = new FakeAnimation();
      animateCalls.push({ element: this, keyframes, options });
      fakeAnimations.push(animation);
      return animation as unknown as Animation;
    };
  });

  afterEach(() => {
    HTMLElement.prototype.animate = originalAnimate;
    TestBed.resetTestingModule();
  });

  it('keeps an exiting view mounted until exit animation completes', async () => {
    TestBed.configureTestingModule({
      imports: [PresenceHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(PresenceHostComponent);
    fixture.detectChanges();
    await flushMotion();

    expect(panelElement()).not.toBeNull();

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    await flushMotion();

    expect(panelElement()).not.toBeNull();
    expect(lastCall().keyframes).toEqual([
      { opacity: '1', transform: 'scale(1)' },
      { opacity: '0', transform: 'scale(0.95)' }
    ]);

    lastAnimation().resolve();
    await flushMotion();

    expect(panelElement()).toBeNull();
  });

  it('cancels exit when presence is restored before completion', async () => {
    TestBed.configureTestingModule({
      imports: [PresenceHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(PresenceHostComponent);
    fixture.detectChanges();
    await flushMotion();

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    await flushMotion();

    const exitAnimation = lastAnimation();
    fixture.componentInstance.shown.set(true);
    fixture.detectChanges();
    await flushMotion();

    expect(exitAnimation.cancel).toHaveBeenCalled();
    expect(fixture.componentInstance.cancels.at(-1)?.reason).toBe(
      'presence-restored'
    );

    exitAnimation.resolve();
    await flushMotion();

    expect(panelElement()).not.toBeNull();
  });

  it('cancels exit safely when the host is destroyed', async () => {
    TestBed.configureTestingModule({
      imports: [PresenceHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(PresenceHostComponent);
    fixture.detectChanges();
    await flushMotion();

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    await flushMotion();

    const exitAnimation = lastAnimation();
    fixture.destroy();

    expect(exitAnimation.cancel).toHaveBeenCalled();
  });
});
