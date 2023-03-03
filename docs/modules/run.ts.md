---
title: run.ts
nav_order: 4
parent: Modules
---

## run overview

All the ways to invoke an Fx including listening to events.

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [observe](#observe)

---

# utils

## observe

Listen to the events of an Fx and run an Effect for each event.
The resulting Effect will resolve with any error that has been raised
or successfully with void.

**Signature**

```ts
export declare const observe: {
  <R, E, A, R2, E2>(fx: any, f: (a: A) => Effect<R2, E2, unknown>): Effect<R | R2, E | E2, void>
  <A, R2, E2>(f: (a: A) => Effect<R2, E2, unknown>): <R, E>(fx: any) => Effect<R2 | R, E2 | E, void>
}
```

Added in v1.0.0
