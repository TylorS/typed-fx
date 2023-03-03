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
  - [delay](#delay)
  - [flatMap](#flatmap)
  - [flatten](#flatten)
  - [hold](#hold)
  - [map](#map)
  - [merge](#merge)
  - [mergeAll](#mergeall)
  - [multicast](#multicast)
  - [onNonInterruptCause](#onnoninterruptcause)
- [Type Guard](#type-guard)
  - [isMap](#ismap)

---

# Operator

## delay

Delay all of the events of an Fx by a specific duration.

**Signature**

```ts
export declare const delay: typeof delay
```

Added in v1.0.0

## flatMap

Construct an Fx from the values of another Fx that and "flatten" them back into
the current Fx.

**Signature**

```ts
export declare const flatMap: {
  <A, R2, O2, E2, B>(f: (a: A) => any): <R1, O1, E1>(self: any) => any
  <R1, O1, E1, A, R2, O2, E2, B>(self: any, f: (a: A) => any): any
}
```

Added in v1.0.0

## flatten

Flatten an Fx of Fx into a single Fx.

**Signature**

```ts
export declare const flatten: <R, E, R2, E2, A>(fx: any) => any
```

Added in v1.0.0

## hold

Effeciently share an underlying Fx with multiple observers and replay
the latest value, when available, to late subscribers.

**Signature**

```ts
export declare const hold: typeof hold
```

Added in v1.0.0

## map

Transform the values of an Fx.

**Signature**

```ts
export declare const map: { <R, E, A, B>(fx: any, f: (a: A) => B): any; <A, B>(f: (a: A) => B): <R, E>(fx: any) => any }
```

Added in v1.0.0

## merge

Merge together 2 Fx instances into a single Fx that emits all of their
values as soon as possible.

**Signature**

```ts
export declare const merge: {
  <R, E, A, R2, E2, B>(first: any, second: any): any
  <R2, E2, B>(second: any): <R, E, A>(first: any) => any
}
```

Added in v1.0.0

## mergeAll

Merge together multiple Fx instances into a single Fx that emits all of their
values as soon as possible.

**Signature**

```ts
export declare const mergeAll: typeof mergeAll
```

Added in v1.0.0

## multicast

Effeciently share an underlying Fx with multiple observers.

**Signature**

```ts
export declare const multicast: <R, E, A>(fx: any) => any
```

Added in v1.0.0

## onNonInterruptCause

Run an Effect for all failures within an Fx making any interrupt end the Fx
instead of failing.

**Signature**

```ts
export declare const onNonInterruptCause: {
  <R, E, A, R2, E2, B>(fx: any, f: (cause: Cause<E>) => Effect<R2, E2, B>): any
  <E, R2, E2, B>(f: (cause: Cause<E>) => Effect<R2, E2, B>): <R, A>(fx: any) => any
}
```

Added in v1.0.0

# Type Guard

## isMap

Detect if an Fx is a MapFx instance. Useful for creating fusion optimizations.

**Signature**

```ts
export declare const isMap: typeof isMap
```

Added in v1.0.0
