# Phase 2 Audit

## Current Architecture

- `@angular-motion/core` contains framework-neutral animation contracts,
  transition resolution, DOM keyframe serialization, reduced-motion helpers, the
  Web Animations API driver, and motion values.
- `@angular-motion/motion` contains Angular integration through the standalone
  `NgMotionDirective`, provider configuration, preset resolution, and variant
  resolution.
- `@angular-motion/presets` contains reusable preset objects.
- Docs and playground examples are intentionally minimal starter artifacts.

## Issues Discovered

- Interaction state is spread across boolean fields in `NgMotionDirective`,
  which makes precedence work by convention instead of an explicit resolver.
- Animation replacement cancels the old playback, but old completion promises
  are not guarded from mutating state or emitting callbacks after replacement.
- There are no public lifecycle events for animation start, completion, or
  cancellation.
- Variants only support static objects and nested `{ target, transition }`
  definitions. Inline variant transitions and dynamic custom data are missing.
- Keyframe arrays are serialized, but invalid keyframes and transition offsets
  are not validated before reaching WAAPI.
- `whileInView` creates one `IntersectionObserver` per directive instead of
  sharing compatible observers.
- Stagger and imperative controls do not exist.
- Exit animations cannot be supported by plain `@if` alone because Angular
  removes DOM synchronously. Presence needs a deliberate wrapper or structural
  API.

## Changes Required

- Add an internal motion state machine to centralize active state precedence.
- Add a guarded animation runner in the directive with generation-based stale
  completion protection.
- Add typed `motionStart`, `motionComplete`, and `motionCancel` outputs.
- Extend variants to support inline transitions and typed dynamic variant
  functions using `[custom]`.
- Validate keyframe arrays, transition offsets, easing arrays, viewport amount,
  and stagger input.
- Add a shared viewport observer service keyed by compatible observer options.
- Add `ngMotionGroup` for child registration and deterministic stagger delays.
- Add `ngMotionPresence` as a structural directive so Angular Motion owns DOM
  removal long enough to play exit animations.
- Add lightweight `motionControls()` and `injectMotionControls()` APIs.

## Decisions Made

- Preserve the existing package boundaries; no broad rewrite is needed.
- State precedence is deterministic: `animate`, then `whileInView`,
  `whileFocus`, `whileHover`, `whileTap`, with imperative controls and exit
  taking final precedence.
- Transition precedence is: active state or variant transition, then local
  `[transition]`, then preset transition, then global default transition.
- Presence is implemented as `*ngMotionPresence` for Phase 2. Plain `@if`
  cannot be intercepted safely without fighting Angular's rendering lifecycle.
- Browser APIs remain isolated behind `isPlatformBrowser` checks or injectable
  services.
