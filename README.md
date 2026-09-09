# ngKinetics

Angular-native motion primitives for animations, interactions, viewport effects, and layout transitions.

```html
<div
  ngKinetics
  [initial]="{ opacity: 0, y: 40 }"
  [animate]="{ opacity: 1, y: 0 }"
  [transition]="{ duration: 0.4, ease: 'out' }"
>
  Hello Angular
</div>

Installation:
npm install @ngkinetics/core

Usage
import { Component } from '@angular/core';
import { NgKineticsDirective } from '@ngkinetics/core';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [NgKineticsDirective],
  template: `
    <div
      ngKinetics
      [initial]="{ opacity: 0, y: 24 }"
      [animate]="{ opacity: 1, y: 0 }"
    >
      Content
    </div>
  `
})
export class ExampleComponent {}

nteractions
<button
  ngKinetics
  [whileHover]="{ scale: 1.05 }"
  [whileTap]="{ scale: 0.96 }"
>
  Continue
</button>
Viewport animations
<section
  ngKinetics
  [initial]="{ opacity: 0, y: 40 }"
  [whileInView]="{ opacity: 1, y: 0 }"
>
  Content
</section>
Features

Current and planned capabilities include:

initial and animate
transitions and easing
keyframes
variants
presets
whileHover
whileTap
whileFocus
whileInView
reduced-motion support
motion values
stagger
presence and exit animations
spring physics
gestures
scroll-linked animation
layout transitions
Packages
@ngkinetics/core
@ngkinetics/presets

Planned packages:

@ngkinetics/gestures
@ngkinetics/scroll
@ngkinetics/layout
@ngkinetics/physics
Development
npm install
npm run typecheck
npm test
npm run lint
npm run build
