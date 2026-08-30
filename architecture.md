# Angular Motion Architecture

Angular Motion is organized as a small TypeScript workspace with strict package
boundaries. The public Angular API lives separately from the rendering runtime so
the engine can grow without coupling every feature to one service.

## Package Boundaries

- `@angular-motion/core`: framework-neutral runtime contracts, motion targets,
  transition resolution, DOM keyframe generation, Web Animations driver,
  reduced-motion helpers, and high-frequency motion value primitives.
- `@angular-motion/motion`: Angular integration, including `ngMotion`,
  `provideAngularMotion`, DI tokens, variant and preset resolution, lifecycle
  cleanup, and browser-only observer/listener setup.
- `@angular-motion/presets`: reusable typed preset definitions that can be
  registered globally or passed directly to `motionPreset`.
- `apps/docs`: documentation source and examples.
- `apps/playground`: future interactive playground surface.

Planned packages such as `gestures`, `scroll`, `layout`, `physics`, `gsap`, and
`devtools` should be introduced when their first production implementation lands.
Empty packages are intentionally avoided.

## Runtime Flow

1. Angular templates provide typed motion targets through `initial`, `animate`,
   `whileHover`, `whileTap`, `whileFocus`, `whileInView`, `variants`,
   `transition`, and `motionPreset`.
2. `NgMotionDirective` resolves labels and presets into concrete targets.
3. Browser-only interactions are attached outside Angular's zone.
4. The directive composes active states, resolves transition defaults, and asks
   the runtime to animate.
5. `MotionAnimator` selects a driver. Phase 1 ships `WebAnimationDriver` and
   falls back to an immediate style write when WAAPI is unavailable, the platform
   is not a browser, or reduced motion is active.
6. Cleanup is owned by `DestroyRef`: animations cancel, listeners detach, and
   `IntersectionObserver` instances disconnect.

## Driver Contract

Drivers implement `AnimationDriver` and expose a stable public surface:

```ts
interface AnimationDriver {
  readonly kind: string;
  canAnimate(element: HTMLElement): boolean;
  animate(
    element: HTMLElement,
    keyframes: Keyframe[],
    transition: ResolvedMotionTransition
  ): AnimationPlayback;
}
```

The directive never depends on a concrete driver. Future packages can register
CSS transition, CSS animation, RAF, or optional GSAP drivers without changing the
template API.

## SSR And Hydration

The directive does not touch `window`, `document`, `matchMedia`,
`IntersectionObserver`, or `Element.animate` unless `isPlatformBrowser` is true.
Initial styles are written through Angular's renderer so server output and
hydration have deterministic starting states.

## Performance Rules

- Transform aliases (`x`, `y`, `scale`, `rotate`, and related properties) are
  merged into a single `transform` style.
- The runtime prefers `transform` and `opacity`, but accepts typed CSS
  properties and custom properties for advanced use.
- DOM event listeners and high-frequency motion updates run outside Angular's
  zone.
- Observers, listeners, animation handles, and animation frame loops are cleaned
  up explicitly.

## Accessibility

`provideAngularMotion({ reducedMotion: 'user' })` respects the user's
`prefers-reduced-motion` setting. Motion state handlers never call
`preventDefault`, so keyboard navigation and native control behavior remain
available.
