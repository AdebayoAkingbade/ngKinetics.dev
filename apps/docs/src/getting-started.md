# Getting Started

Import `NgMotionDirective` into a standalone component and configure providers
once at application bootstrap.

```ts
import { Component } from '@angular/core';
import { NgMotionDirective } from '@angular-motion/motion';

@Component({
  imports: [NgMotionDirective],
  selector: 'docs-example',
  standalone: true,
  template: `
    <div
      ngMotion
      [initial]="{ opacity: 0, y: 32 }"
      [animate]="{ opacity: 1, y: 0 }"
      [transition]="{ duration: 0.35, ease: 'out' }">
      Angular-native motion
    </div>
  `
})
export class DocsExampleComponent {}
```

Angular Motion is free and open-source under the MIT License.

For a browser-ready docs page, open `apps/docs/src/index.html`.
