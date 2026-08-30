import { Component } from '@angular/core';
import { NgMotionDirective } from '@angular-motion/motion';

@Component({
  imports: [NgMotionDirective],
  selector: 'am-playground-example',
  standalone: true,
  template: `
    <button
      ngMotion
      [initial]="{ opacity: 0, y: 16 }"
      [animate]="{ opacity: 1, y: 0 }"
      [whileHover]="{ scale: 1.04 }"
      [whileTap]="{ scale: 0.96 }"
      [transition]="{ duration: 0.28, ease: 'out' }">
      Preview motion
    </button>
  `
})
export class PlaygroundExampleComponent {}
