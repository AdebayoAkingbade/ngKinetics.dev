# Angular Motion

Angular Motion is an Angular-native library for building animations, gestures, scroll effects, and layout transitions using a declarative API.

```html
<div
  ngMotion
  [initial]="{ opacity: 0, y: 40 }"
  [animate]="{ opacity: 1, y: 0 }"
  [transition]="{ duration: 0.4, ease: 'out' }"
>
  Hello Angular
</div>
```

## Status

This project is under active development. APIs may change before the first stable release.

## Goals

Angular Motion is designed to work naturally with modern Angular applications.

The library aims to be:

* Angular and TypeScript native
* Signals-friendly
* standalone-first
* tree-shakeable
* SSR and hydration safe
* zoneless compatible
* accessible
* lightweight

The core package will not require GSAP or Angular's deprecated animation APIs.

## Planned API

### Hover and press

```html
<button
  ngMotion
  [whileHover]="{ scale: 1.05 }"
  [whileTap]="{ scale: 0.96 }"
>
  Continue
</button>
```

### Scroll reveal

```html
<section
  ngMotion
  [initial]="{ opacity: 0, y: 40 }"
  [whileInView]="{ opacity: 1, y: 0 }"
>
  Content
</section>
```

### Variants

```ts
const variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};
```

```html
<div
  ngMotion
  [variants]="variants"
  initial="hidden"
  animate="visible"
>
  Content
</div>
```

## Features

Planned support includes:

* enter and exit animations
* keyframes
* easing and transitions
* hover, press and focus states
* viewport animations
* staggered animations
* variants and presets
* motion values
* spring physics
* drag, pan and swipe gestures
* scroll-linked animations
* parallax
* layout animations
* shared element transitions
* timelines
* reduced-motion preferences

## Architecture

The public API is independent of the underlying animation implementation.

```text
Angular Template
       |
       v
   ngMotion
       |
       v
 Motion Runtime
       |
       +-- CSS
       +-- Web Animations API
       +-- requestAnimationFrame
       +-- Optional adapters
```

Simple animations should use the lightest suitable browser mechanism.

More advanced animation engines can be provided through optional adapters without becoming dependencies of the core package.

## Packages

The project is expected to be split into focused packages as it grows.

```text
packages/
  core
  gestures
  scroll
  layout
  physics
  presets

apps/
  docs
  playground
```

## Performance

Angular Motion should avoid unnecessary Angular change detection and DOM work.

The implementation should:

* prefer `transform` and `opacity`
* batch animation-frame work
* avoid layout thrashing
* clean up observers and event listeners
* keep high-frequency animation state outside normal application rendering where appropriate

## Accessibility

User motion preferences will be respected through `prefers-reduced-motion`.

Animations must not interfere with keyboard navigation, focus management, or application functionality.

## Roadmap

### Core

* [ ] `ngMotion`
* [ ] `initial`
* [ ] `animate`
* [ ] transitions
* [ ] keyframes
* [ ] `whileHover`
* [ ] `whileTap`
* [ ] `whileFocus`
* [ ] `whileInView`
* [ ] variants
* [ ] reduced motion
* [ ] SSR support

### Motion

* [ ] motion values
* [ ] springs
* [ ] interpolation
* [ ] stagger
* [ ] timelines

### Interaction

* [ ] drag
* [ ] pan
* [ ] swipe
* [ ] scroll progress
* [ ] parallax
* [ ] layout animations
* [ ] shared element transitions

### Tooling

* [ ] documentation
* [ ] playground
* [ ] presets
* [ ] CLI
* [ ] component registry
* [ ] devtools

## Development

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run lint
```

Development commands may change while the repository structure is being established.

## Contributing

The project is still in its early stages. Contribution guidelines will be added once the core API and package boundaries are stable.

## License

To be determined.
