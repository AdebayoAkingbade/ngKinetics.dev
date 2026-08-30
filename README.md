# Angular Motion

Angular Motion is an Angular-native motion and interactive UI framework. The
project is standalone-first, signals-friendly, SSR compatible, and built around
typed declarative APIs for Angular templates.

```html
<div
  ngMotion
  [initial]="{ opacity: 0, y: 40 }"
  [animate]="{ opacity: 1, y: 0 }"
  [transition]="{ duration: 0.4, ease: 'out' }">
</div>
```

The first development phase establishes the runtime boundaries, Web Animations
driver, Angular directive, reduced-motion behavior, interactive states, and
documentation examples.
