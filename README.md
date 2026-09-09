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
Angular Motion is free and open-source under the MIT License.

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

Current support includes:

* standalone `ngMotion` directive
* `initial`, `animate`, `exit`, and `transition`
* variants, presets, and custom variant data
* hover, press, focus, and viewport states
* keyframes with offsets and per-segment easing
* staggered child animations
* presence wrapper for exit animations
* typed lifecycle events
* imperative animation controls
* motion values
* reduced-motion preferences
* SSR-safe browser API access

Planned later-phase support includes drag, pan, swipe, spring physics,
scroll-linked animations, parallax, layout FLIP, shared-element transitions,
timelines, CLI tooling, and devtools.

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

## Security

Angular Motion has no server runtime and does not load remote code, evaluate
strings as JavaScript, or make network requests from animation primitives.
Runtime style-property validation protects the DOM write boundary when
TypeScript is bypassed. See [SECURITY.md](./SECURITY.md) and
[docs/security.md](./docs/security.md).

## Roadmap

### Core

* [x] `ngMotion`
* [x] `initial`
* [x] `animate`
* [x] transitions
* [x] keyframes
* [x] `whileHover`
* [x] `whileTap`
* [x] `whileFocus`
* [x] `whileInView`
* [x] variants
* [x] reduced motion
* [x] SSR support

### Motion

* [x] motion values
* [ ] springs
* [x] interpolation
* [x] stagger
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

* [x] documentation
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
npm run typecheck
```

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run security:audit:prod
```

Development commands may change while the repository structure is being established.

## Contributing

The project is still in its early stages. Contribution guidelines will be added once the core API and package boundaries are stable.

## License

MIT
