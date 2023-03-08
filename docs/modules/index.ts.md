---
title: index.ts
nav_order: 2
parent: Modules
---

## index overview

Fx is a push-based reactive data structure that declaratively represents multi-shot Effects.

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Constructor](#constructor)
  - [at](#at)
  - [empty](#empty)
  - [fail](#fail)
  - [failCause](#failcause)
  - [fromArray](#fromarray)
  - [fromEffect](#fromeffect)
  - [fromFxEffect](#fromfxeffect)
  - [gen](#gen)
  - [succeed](#succeed)
  - [suspend](#suspend)
  - [suspendSucceed](#suspendsucceed)
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
- [Run](#run)
  - [collectAll](#collectall)
  - [drain](#drain)
  - [observe](#observe)
- [Type Guard](#type-guard)
  - [isFromEffect](#isfromeffect)
  - [isMap](#ismap)

---

# Constructor

## at

Construct an Fx which will run with a value at a specific delay from the time of subscription.

**Signature**

```ts
export declare const at: { <A>(value: A, delay: Duration): any; (delay: Duration): <A>(value: A) => any }
```

**Example**

```ts
import * as assert from 'assert'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'
import * as Duration from '@effect/data/Duration'

const stream: Fx.Fx<never, never, number> = Fx.at(Duration.millis(100), 42)
const effect: Effect.Effect<never, never, readoly number[]> = Fx.collectAll(stream)
const result: readonly number[] = await Effect.runPromise(effect)

assert.deepStrictEqual(result, [42])
```

Added in v1.0.0

## empty

Construct an Fx which will end as soon as it is subscribed to.

**Signature**

```ts
export declare const empty: () => any
```

**Example**

```ts
import * as assert from 'assert'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'

const stream: Fx.Fx<never, never, never> = Fx.empty()
const effect: Effect.Effect<never, never, readonly never[]> = Fx.collectAll(stream)
const result: readonly never[] = await Effect.runPromise(effect)

assert.deepStrictEqual(result, [])
```

Added in v1.0.0

## fail

Construct a failed Fx from an error.

**Signature**

```ts
export declare const fail: <E>(error: E) => any
```

**Example**

```ts
import * as assert from 'assert'
import * as Either from '@effect/data/Either'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'

const stream: Fx.Fx<never, string, never> = Fx.fail('error')
const effect: Effect.Effect<never, string, readonly never[]> = Fx.collectAll(stream)
const result: Either.Either<string, readonly never[]> = await Effect.runPromiseEither(effect)

assert.deepStrictEqual(result, Either.left('error'))
```

Added in v1.0.0

## failCause

Construct a failed Fx from a Cause.

**Signature**

```ts
export declare const failCause: <E>(cause: Cause<E>) => any
```

**Example**

```ts
import * as assert from 'assert'
import * as Cause from '@effect/io/Cause'
import * as Either from '@effect/data/Either'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'

const stream: Fx.Fx<never, string, never> = Fx.failCause(Cause.fail('error'))
const effect: Effect.Effect<never, string, readonly never[]> = Fx.collectAll(stream)
const result: Either.Either<string, readonly never[]> = await Effect.runPromiseEither(effect)

assert.deepStrictEqual(result, Either.left('error'))
```

Added in v1.0.0

## fromArray

Construct a Fx from an array of values.

**Signature**

```ts
export declare const fromArray: <T extends readonly any[]>(array: readonly [...T]) => any
```

**Example**

```ts
import * as assert from 'assert'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'

const stream: Fx.Fx<never, never, number> = Fx.fromArray([1, 2, 3])
const effect: Effect.Effect<never, never, readonly number[]> = Fx.collectAll(stream)
const result: readonly number[] = await Effect.runPromise(effect)

assert.deepStrictEqual(result, [1, 2, 3])
```

Added in v1.0.0

## fromEffect

Construct a Fx from an Effect.

**Signature**

```ts
export declare const fromEffect: <Services, Errors, Output>(effect: Effect<Services, Errors, Output>) => any
```

**Example**

```ts
import * as assert from 'assert'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'

const stream: Fx.Fx<never, never, number> = Fx.fromEffect(Effect.succeed(42))
const effect: Effect.Effect<never, never, readonly number[]> = Fx.collectAll(stream)
const result: readonly number[] = await Effect.runPromise(effect)

assert.deepStrictEqual(result, [42])
```

Added in v1.0.0

## fromFxEffect

Construct a Fx from an Effect returning an Fx.

**Signature**

```ts
export declare const fromFxEffect: <R, E, R2 = never, E2 = never, A = unknown>(effect: Effect<R, E, any>) => any
```

**Example**

```ts
import * as assert from 'assert'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'

const stream: Fx.Fx<never, never, number> = Fx.fromFxEffect(Effect.succeed(Fx.succeed(42)))
const effect: Effect.Effect<never, never, readonly number[]> = Fx.collectAll(stream)
const result: readonly number[] = await Effect.runPromise(effect)

assert.deepStrictEqual(result, [42])
```

Added in v1.0.0

## gen

Construct a Fx from an Generator of Effects returning an Fx.

**Signature**

```ts
export declare const gen: <Eff extends EffectGen<any, any, any>, R, E, A>(
  f: (resume: <R, E, A>(effect: Effect<R, E, A>) => EffectGen<R, E, A>) => Generator<Eff, any, unknown>
) => any
```

**Example**

```ts
import * as assert from 'assert'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'

const stream: Fx.Fx<never, never, number> = Fx.gen(function* ($) {
  // Run any number of Effect before returning an Fx
  const x = yield* $(Effect.succeed(1))
  const y = yield* $(Effect.succeed(2))

  return Fx.succeed(x + y)
})

const effect: Effect.Effect<never, never, readonly number[]> = Fx.collectAll(stream)
const result: readonly number[] = await Effect.runPromise(effect)

assert.deepStrictEqual(result, [3])
```

Added in v1.0.0

## succeed

Construct a successful Fx from a value.

**Signature**

```ts
export declare const succeed: <A>(value: A) => any
```

**Example**

```ts
import * as assert from 'assert'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'

const stream: Fx.Fx<never, never, number> = Fx.succeed(42)
const effect: Effect.Effect<never, never, readonly number[]> = Fx.collectAll(stream)
const result: readonly number[] = await Effect.runPromise(effect)

assert.deepStrictEqual(result, [42])
```

Added in v1.0.0

## suspend

Lazily construct an Fx from a function that can possibly fail.

**Signature**

```ts
export declare const suspend: <R, E, A>(f: () => any) => any
```

**Example**

```ts
import * as assert from 'assert'
import * as Effect from '@effect/io/Effect'
import * as Exit from '@effect/io/Exit'
import * as Fx from '@typed/fx'

const value = Math.random()
const error = new Error('Uh-oh')
const stream: Fx.Fx<never, never, number> = Fx.suspend(() => {
  if (value > 0.5) {
    throw error
  }

  return Fx.succeed(value)
})
const effect: Effect.Effect<never, never, readonly number[]> = Fx.collectAll(stream)
const result: Exit.Exit<never, readonly number[]> = await Effect.runPromiseExit(effect)

if (value > 0.5) {
  assert.deepStrictEqual(result, Exit.die(error))
} else {
  assert.deepStrictEqual(result, Exit.succeed([value]))
}
```

Added in v1.0.0

## suspendSucceed

Lazily construct an Fx from a function that will not fail.

**Signature**

```ts
export declare const suspendSucceed: <R, E, A>(f: () => any) => any
```

**Example**

```ts
import * as assert from 'assert'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'

const stream: Fx.Fx<never, never, number> = Fx.suspendSucceed(() => Fx.succeed(42))
const effect: Effect.Effect<never, never, readonly number[]> = Fx.collectAll(stream)
const result: readonly number[] = await Effect.runPromise(effect)

assert.deepStrictEqual(result, [42])
```

Added in v1.0.0

# Operator

## delay

Delay all of the events of an Fx by a specific duration.

**Signature**

```ts
export declare const delay: {
  <R, E, A>(fx: any, duration: Duration): any
  (duration: Duration): <R, E, A>(fx: any) => any
}
```

**Example**

```ts
import * as assert from 'assert'
import * as Effect from '@effect/io/Effect'
import * as Fx from '@typed/fx'
import * as Duration from '@effect/data/Duration'

const stream: Fx.Fx<never, never, number> = Fx.delay(Fx.succeed(42), Duration.millis(1000))
const effect: Effect.Effect<never, never, readonly number[]> = Fx.collectAll(stream)
const result: readonly number[] = await Effect.runPromise(effect)

assert.deepStrictEqual(result, [42])
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
export declare const hold: <R, E, A>(fx: any) => any
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
export declare const mergeAll: <Streams extends readonly any[]>(...streams: Streams) => any
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

# Run

## collectAll

Collect all the values of an Fx into an Array

**Signature**

```ts
export declare const collectAll: <R, E, A>(fx: any) => Effect<R, E, readonly A[]>
```

Added in v1.0.0

## drain

Activate an Fx.

**Signature**

```ts
export declare const drain: <R, E, A>(fx: any) => Effect<R, E, void>
```

Added in v1.0.0

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

# Type Guard

## isFromEffect

Detect if an Fx is a FromEffect instance. Useful for creating fusion optimizations.

**Signature**

```ts
export declare const isFromEffect: typeof isFromEffect
```

Added in v1.0.0

## isMap

Detect if an Fx is a MapFx instance. Useful for creating fusion optimizations.

**Signature**

```ts
export declare const isMap: typeof isMap
```

Added in v1.0.0
