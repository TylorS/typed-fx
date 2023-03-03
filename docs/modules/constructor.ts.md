---
title: constructor.ts
nav_order: 1
parent: Modules
---

## constructor overview

All the ways to construct an Fx.

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Constructor](#constructor)
  - [at](#at)
  - [fail](#fail)
  - [failCause](#failcause)
  - [fromArray](#fromarray)
  - [fromEffect](#fromeffect)
  - [fromFxEffect](#fromfxeffect)
  - [gen](#gen)
  - [succeed](#succeed)
  - [suspendSucceed](#suspendsucceed)
- [Type Guard](#type-guard)
  - [isFromEffect](#isfromeffect)

---

# Constructor

## at

Construct an Fx which will run with a value at a specific delay from the time of subscription.

**Signature**

```ts
export declare const at: { <A>(value: A, delay: Duration): any; (delay: Duration): <A>(value: A) => any }
```

Added in v1.0.0

## fail

Construct a failed Fx from an error.

**Signature**

```ts
export declare const fail: <E>(error: E) => any
```

Added in v1.0.0

## failCause

Construct a failed Fx from a Cause.

**Signature**

```ts
export declare const failCause: <E>(cause: Cause<E>) => any
```

Added in v1.0.0

## fromArray

Construct a Fx from an array of values.

**Signature**

```ts
export declare const fromArray: typeof fromArray
```

Added in v1.0.0

## fromEffect

Construct a Fx from an Effect.

**Signature**

```ts
export declare const fromEffect: typeof fromEffect
```

Added in v1.0.0

## fromFxEffect

Construct a Fx from an Effect returning an Fx.

**Signature**

```ts
export declare const fromFxEffect: typeof fromFxEffect
```

Added in v1.0.0

## gen

Construct a Fx from an Generator of Effects returning an Fx.

**Signature**

```ts
export declare const gen: typeof gen
```

Added in v1.0.0

## succeed

Construct a successful Fx from a value.

**Signature**

```ts
export declare const succeed: <A>(value: A) => any
```

Added in v1.0.0

## suspendSucceed

Lazily construct an Fx from a function that will not fail.

**Signature**

```ts
export declare const suspendSucceed: typeof suspendSucceed
```

Added in v1.0.0

# Type Guard

## isFromEffect

Detect if an Fx is a FromEffect instance. Useful for creating fusion optimizations.

**Signature**

```ts
export declare const isFromEffect: typeof isFromEffect
```

Added in v1.0.0
