# Phase 1 Examples

## Install Providers

```ts
import { ApplicationConfig } from '@angular/core';
import { provideAngularMotion } from '@angular-motion/motion';
import { angularMotionPresets } from '@angular-motion/presets';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAngularMotion({
      presets: angularMotionPresets,
      reducedMotion: 'user'
    })
  ]
};
```

## Basic Motion

```html
<div
  ngMotion
  [initial]="{ opacity: 0, y: 40 }"
  [animate]="{ opacity: 1, y: 0 }"
  [transition]="{ duration: 0.4, ease: 'out' }">
</div>
```

## Variants

```ts
readonly cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    target: { opacity: 1, y: 0 },
    transition: { duration: 0.32, ease: 'out' }
  }
};
```

```html
<article
  ngMotion
  initial="hidden"
  animate="visible"
  [variants]="cardVariants">
</article>
```

## Interaction States

```html
<button
  ngMotion
  [initial]="{ opacity: 0, y: 12 }"
  [animate]="{ opacity: 1, y: 0 }"
  [whileHover]="{ scale: 1.03 }"
  [whileTap]="{ scale: 0.97 }"
  [whileFocus]="{ boxShadow: '0 0 0 4px rgba(14, 165, 233, 0.28)' }">
  Save
</button>
```

## Viewport Entry

```html
<section
  ngMotion
  motionPreset="fadeUp"
  [whileInView]="{ opacity: 1, y: 0 }"
  [viewport]="{ amount: 0.35, once: true }">
</section>
```

## Motion Values

```ts
import { motionValue, transform, velocity } from '@angular-motion/core';

const x = motionValue(0);
const opacity = transform(x, [-100, 0, 100], [0, 1, 0]);
const xVelocity = velocity(x);

x.set(80);
```

## Accessibility Notes

`provideAngularMotion({ reducedMotion: 'user' })` reads
`prefers-reduced-motion` in the browser and applies final styles immediately for
users who request reduced motion. Gesture handlers never call `preventDefault`,
so native keyboard and pointer behavior remain available.
