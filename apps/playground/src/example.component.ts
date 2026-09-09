import { Component, signal } from '@angular/core';
import type { MotionTarget, MotionVariants } from '@angular-motion/core';
import {
  NgMotionDirective,
  NgMotionGroupDirective,
  NgMotionPresenceComponent,
  motionControls
} from '@angular-motion/motion';

@Component({
  imports: [
    NgMotionDirective,
    NgMotionGroupDirective,
    NgMotionPresenceComponent
  ],
  selector: 'am-playground-example',
  standalone: true,
  template: `
    <section>
      <div
        ngMotion
        [initial]="{ opacity: 0, y: 16 }"
        [animate]="{ opacity: 1, y: 0 }"
        [transition]="{ duration: 0.28, ease: 'out' }">
        Basic animation
      </div>

      <button
        ngMotion
        [animate]="{ scale: 1 }"
        [whileHover]="{ scale: 1.04 }"
        [whileTap]="{ scale: 0.96 }">
        Hover and tap
      </button>

      @for (item of variantItems(); track item; let index = $index) {
        <div
          ngMotion
          initial="hidden"
          animate="visible"
          [custom]="index"
          [variants]="variants">
          Variant {{ item }}
        </div>
      }

      <div
        ngMotion
        [animate]="keyframeTarget"
        [transition]="{
          duration: 1,
          ease: ['out', 'linear', 'in'],
          times: [0, 0.4, 0.75, 1]
        }">
        Keyframes
      </div>

      <div ngMotionGroup [stagger]="0.08">
        @for (item of staggerItems(); track item) {
          <span
            ngMotion
            [initial]="{ opacity: 0, y: 12 }"
            [animate]="{ opacity: 1, y: 0 }">
            {{ item }}
          </span>
        }
      </div>

      <div
        ngMotion
        [initial]="{ opacity: 0 }"
        [animate]="{ opacity: 0 }"
        [whileInView]="{ opacity: 1 }"
        [viewport]="{ amount: 0.5, once: true }">
        Viewport animation
      </div>

      <button type="button" (click)="open.update((value) => !value)">
        Toggle presence
      </button>
      <ng-motion-presence [present]="open()">
        <ng-template>
          <div
            ngMotion
            [initial]="{ opacity: 0, scale: 0.95 }"
            [animate]="{ opacity: 1, scale: 1 }"
            [exit]="{ opacity: 0, scale: 0.95 }">
            Presence panel
          </div>
        </ng-template>
      </ng-motion-presence>

      <button type="button" (click)="runControls()">Run controls</button>
      <button type="button" (click)="resetControls()">Reset controls</button>
      <div
        ngMotion
        [initial]="{ opacity: 0.6, x: 0 }"
        [animate]="controls">
        Imperative controls
      </div>

      <div
        ngMotion
        [initial]="{ opacity: 0, y: 40 }"
        [animate]="{ opacity: 1, y: 0 }">
        Reduced motion uses the configured final state
      </div>
    </section>
  `
})
export class PlaygroundExampleComponent {
  readonly controls = motionControls();
  readonly open = signal(true);
  readonly staggerItems = signal(['One', 'Two', 'Three']);
  readonly variantItems = signal(['A', 'B', 'C']);
  readonly keyframeTarget: MotionTarget = {
    opacity: [0, 1],
    scale: [1, 1.2, 0.95, 1]
  };
  readonly variants: MotionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (index: unknown) => ({
      opacity: 1,
      transition: { delay: Number(index) * 0.05, duration: 0.3 },
      y: 0
    })
  };

  runControls(): void {
    this.controls.start({ opacity: 1, x: 80 }, { duration: 0.3 });
  }

  resetControls(): void {
    this.controls.set({ opacity: 0.6, x: 0 });
  }
}
