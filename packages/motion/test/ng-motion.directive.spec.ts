import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MotionStateInput, MotionTransition, MotionVariants } from '@angular-motion/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NgMotionDirective } from '../src/ng-motion.directive';
import { provideAngularMotion } from '../src/provide-angular-motion';

interface AnimateCall {
  element: HTMLElement;
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null;
  options: number | KeyframeAnimationOptions | undefined;
}

interface FakeAnimationRecord {
  cancel: () => void;
  commitStyles: () => void;
  finished: Promise<Animation>;
  playState: AnimationPlayState;
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
      [transition]="transition"
      [whileHover]="whileHover"
      [whileTap]="whileTap"
      [whileFocus]="whileFocus"
      [whileInView]="whileInView"
      [variants]="variants"
      [viewport]="viewport"
      [motionPreset]="motionPreset">
      Motion
    </div>
  `
})
class MotionHostComponent {
  initial: MotionStateInput = { opacity: 0, y: 40 };
  animate: MotionStateInput = { opacity: 1, y: 0 };
  transition: MotionTransition | undefined = { duration: 0.4, ease: 'out' };
  whileHover: MotionStateInput;
  whileTap: MotionStateInput;
  whileFocus: MotionStateInput;
  whileInView: MotionStateInput;
  variants: MotionVariants | undefined;
  viewport: { amount?: number; once?: boolean } | undefined;
  motionPreset: string | undefined;
}

type ObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver
) => void;

class FakeIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly scrollMargin = '0px';
  readonly thresholds: readonly number[] = [0];
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  constructor(private readonly callback: ObserverCallback) {
    fakeObservers.push(this);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(entry: Partial<IntersectionObserverEntry>): void {
    this.callback([entry as IntersectionObserverEntry], this);
  }
}

const animateCalls: AnimateCall[] = [];
const fakeAnimations: FakeAnimationRecord[] = [];
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

function pointerEvent(type: string, pointerType = 'mouse'): PointerEvent {
  const event = new Event(type) as PointerEvent;
  Object.defineProperty(event, 'button', { value: 0 });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}

async function flushMotion(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
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
      const fakeAnimation: FakeAnimationRecord = {
        cancel: vi.fn(() => {
          fakeAnimation.playState = 'idle';
        }),
        commitStyles: vi.fn(),
        finished: Promise.resolve(undefined as unknown as Animation),
        playState: 'running'
      };

      animateCalls.push({ element: this, keyframes, options });
      fakeAnimations.push(fakeAnimation);

      return fakeAnimation as unknown as Animation;
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
    expect(animateCalls[0]?.keyframes).toEqual([
      { opacity: '0', transform: 'translateY(40px)' },
      { opacity: '1', transform: 'translateY(0px)' }
    ]);
    expect(animateCalls[0]?.options).toMatchObject({
      duration: 400,
      easing: 'cubic-bezier(0, 0, 0.2, 1)'
    });
  });

  it('resolves string variants from template inputs', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.componentInstance.initial = 'hidden';
    fixture.componentInstance.animate = 'visible';
    fixture.componentInstance.variants = {
      hidden: { opacity: 0, y: 20 },
      visible: {
        target: { opacity: 1, y: 0 },
        transition: { duration: 0.2, ease: 'linear' }
      }
    };
    fixture.detectChanges();
    await flushMotion();

    expect(animateCalls[0]?.keyframes).toEqual([
      { opacity: '0', transform: 'translateY(20px)' },
      { opacity: '1', transform: 'translateY(0px)' }
    ]);
    expect(animateCalls[0]?.options).toMatchObject({
      duration: 200,
      easing: 'linear'
    });
  });

  it('composes hover and tap states without preventing native input behavior', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.componentInstance.initial = false;
    fixture.componentInstance.animate = { scale: 1 };
    fixture.componentInstance.whileHover = { scale: 1.05 };
    fixture.componentInstance.whileTap = { scale: 0.96 };
    fixture.detectChanges();
    await flushMotion();

    const box = boxElement();
    box.dispatchEvent(pointerEvent('pointerenter'));
    await flushMotion();

    expect(animateCalls.at(-1)?.keyframes).toEqual([
      { transform: 'scale(1)' },
      { transform: 'scale(1.05)' }
    ]);

    box.dispatchEvent(pointerEvent('pointerdown'));
    await flushMotion();

    expect(animateCalls.at(-1)?.keyframes).toEqual([
      { transform: 'scale(1.05)' },
      { transform: 'scale(0.96)' }
    ]);

    box.dispatchEvent(pointerEvent('pointerup'));
    await flushMotion();

    expect(animateCalls.at(-1)?.keyframes).toEqual([
      { transform: 'scale(0.96)' },
      { transform: 'scale(1.05)' }
    ]);
  });

  it('activates whileInView through IntersectionObserver and disconnects on destroy', async () => {
    TestBed.configureTestingModule({
      imports: [MotionHostComponent],
      providers: [provideAngularMotion()]
    });

    const fixture = TestBed.createComponent(MotionHostComponent);
    fixture.componentInstance.initial = false;
    fixture.componentInstance.animate = { opacity: 0 };
    fixture.componentInstance.whileInView = { opacity: 1 };
    fixture.componentInstance.viewport = { amount: 0.5, once: true };
    fixture.detectChanges();
    await flushMotion();

    const observer = fakeObservers[0];

    if (observer === undefined) {
      throw new Error('Expected IntersectionObserver to be created.');
    }

    observer.trigger({
      intersectionRatio: 1,
      isIntersecting: true,
      target: boxElement()
    });
    await flushMotion();

    expect(animateCalls.at(-1)?.keyframes).toEqual([
      { opacity: '0' },
      { opacity: '1' }
    ]);

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(fakeAnimations.at(-1)?.cancel).toHaveBeenCalled();
  });

  it('applies final styles immediately when reduced motion is always enabled', async () => {
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
  });
});
