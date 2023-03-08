---
title: Fx.ts
nav_order: 1
parent: Modules
---

## Fx overview

A `Fx` is a push-based reactive data structure that declaratively represents multi-shot Effects.
An Fx can call its provided Sink 0 or more times, and then call Sink.error or Sink.end exactly once.

With an Fx you can represent workflows that exist over time like RPC, DOM Event, and so much more.
You can skip, take, filter, and transform the events of an Fx. You can also easily create your own.

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [Constructor](#constructor)
  - [Sink](#sink)
- [Model](#model)
  - [Fx (interface)](#fx-interface)
  - [Sink (interface)](#sink-interface)
- [Type Guard](#type-guard)
  - [isFx](#isfx)
- [Type Lambda](#type-lambda)
  - [FxTypeLambda (interface)](#fxtypelambda-interface)

---

# Constructor

## Sink

Construct a Sink.

**Signature**

```ts
export declare function Sink<Services1, Services2, Services3, Errors, Output>(
  event: Sink<Services1, Errors, Output>['event'],
  error: Sink<Services2, Errors, Output>['error'],
  end: Sink<Services3, Errors, Output>['end']
): Sink<Services1 | Services2 | Services3, Errors, Output>
```

Added in v1.0.0

# Model

## Fx (interface)

A `Fx` is a push-based reactive data structure that declaratively represents a multi-shot Effects.
An Fx can call its provided Sink 0 or more times, and then call Sink.error or Sink.end exactly once.

It makes use of Scope to ensure that all resources are properly released including any "nested" Fx
being run by higher-order Fx operators like flatMap or switchMap but not limited to.

**Signature**

```ts
export interface Fx<out Services, out Errors, out Output> {
  readonly _tag: string

  /**
   * The main API for running an Fx.
   * @macro traced
   */
  run<Services2>(services: Sink<Services2, Errors, Output>): Effect<Services | Services2 | Scope, never, unknown>

  /**
   * Add a trace to an Fx.
   */
  traced(trace: Trace): Fx<Services, Errors, Output>
}
```

Added in v1.0.0

## Sink (interface)

A `Sink` is receiver of a `Fx`'s events and errors. It describes event and error.

**Signature**

```ts
export interface Sink<out Services,
```

Added in v1.0.0

# Type Guard

## isFx

Verify that a value is an Fx.

**Signature**

```ts
export declare const isFx: typeof isFx
```

Added in v1.0.0

# Type Lambda

## FxTypeLambda (interface)

TypeLambda for typeclasses using Fx.

**Signature**

```ts
export interface FxTypeLambda extends TypeLambda {
  readonly type: Fx<this['Out2'], this['Out1'], this['Target']>
}
```

Added in v1.0.0
