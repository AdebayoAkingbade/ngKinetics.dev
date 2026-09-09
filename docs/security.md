# Security And Scale

Security is a product feature for Angular Motion. The goal is not to claim that
any project is impossible to break; the goal is to make compromise expensive,
detectable, narrowly scoped, and quickly fixable.

## Current Posture

- Production dependency audit: `npm audit --omit=dev` reported zero known
  vulnerabilities during the September 9, 2026 hardening pass.
- The public runtime has no server component and no database, authentication,
  payment, or secret-handling surface.
- Browser APIs are isolated behind platform checks for SSR and hydration safety.
- Motion target properties are validated at runtime before DOM style writes.
- The package set is split into small, tree-shakeable packages with explicit
  peer dependencies.
- CI runs lint, typecheck, tests, build, and production dependency audit.
- Dependabot is configured for npm and GitHub Actions updates.
- CodeQL is configured for scheduled and PR static analysis.

## Threat Model

Angular Motion can affect the DOM styles of elements where developers attach
`ngMotion`. The main risks are supply-chain compromise, accidental unsafe style
configuration, documentation-site compromise, browser compatibility bugs, and
API behavior that surprises application developers.

The library must not:

- load remote code at runtime
- evaluate strings as JavaScript
- require secrets in browser code
- make network requests from animation primitives
- mutate DOM outside the host element except for documented presence/view
  container behavior
- depend on private Angular internals

## Consumer Guidance

Treat animation targets like any other DOM-affecting configuration. Do not pass
raw user input into `animate`, `initial`, `whileHover`, `whileTap`,
`whileFocus`, `whileInView`, variants, presets, or imperative controls.

Good:

```ts
const variants = {
  selected: { scale: 1.04, opacity: 1 },
  idle: { scale: 1, opacity: 0.9 }
};
```

Avoid:

```ts
const target = JSON.parse(userProvidedAnimationConfig);
```

## Billion-User Readiness

For a library, scale is mostly about predictability and release discipline:

- keep package size small
- avoid global mutable state
- clean up animations, listeners, and observers
- run interaction code outside Angular change detection where possible
- keep SSR behavior deterministic
- document migration paths before breaking APIs
- maintain a responsible vulnerability disclosure process
- require automated checks before merges and releases
- publish packages with provenance and signed provenance metadata when enabled

## Release Gate

Before publishing:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run security:audit:prod
```

For security-sensitive releases, also run a full dev dependency audit:

```bash
npm run security:audit
```
