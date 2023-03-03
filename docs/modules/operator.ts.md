---
title: operator.ts
nav_order: 4
parent: Modules
---

## operator overview

All the ways to interact with an Fx.

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Operator](#operator)
  - [map](#map)
- [Type Guard](#type-guard)
  - [isMap](#ismap)

---

# Operator

## map

Construct a Fx from an Effect.

**Signature**

```ts
export declare const map: { <R, E, A, B>(fx: any, f: (a: A) => B): any; <A, B>(f: (a: A) => B): <R, E>(fx: any) => any }
```

Added in v1.0.0

# Type Guard

## isMap

Detect if an Fx is a FromEffect instance. Useful for creating fusion optimizations.

**Signature**

```ts
export declare const isMap: typeof isMap
```

Added in v1.0.0
