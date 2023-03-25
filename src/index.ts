export {
  /**
   * Construct an Fx which will run with a value at a specific delay from the time of subscription.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   * import * as Duration from '@effect/data/Duration'
   *
   * const stream: Fx.Fx<never, never, number> = Fx.at(Duration.millis(100), 42)
   * const effect: Effect.Effect<never, never, readoly number[]> = Fx.runCollectAll(stream)
   * const result: readonly number[] = await Effect.runPromise(effect)
   *
   * assert.deepStrictEqual(result, [42])
   */
  at,
  /**
   * Construct an Fx which will end as soon as it is subscribed to.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   *
   * const stream: Fx.Fx<never, never, never> = Fx.empty()
   * const effect: Effect.Effect<never, never, readonly never[]> = Fx.runCollectAll(stream)
   * const result: readonly never[] = await Effect.runPromise(effect)
   *
   * assert.deepStrictEqual(result, [])
   */
  empty,
  /**
   * Construct a failed Fx from an error.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Either from '@effect/data/Either'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   *
   * const stream: Fx.Fx<never, string, never> = Fx.fail('error')
   * const effect: Effect.Effect<never, string, readonly never[]> = Fx.runCollectAll(stream)
   * const result: Either.Either<string, readonly never[]> = await Effect.runPromiseEither(effect)
   *
   * assert.deepStrictEqual(result, Either.left('error'))
   */
  fail,
  /**
   * Construct a failed Fx from a Cause.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Cause from '@effect/io/Cause'
   * import * as Either from '@effect/data/Either'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   *
   * const stream: Fx.Fx<never, string, never> = Fx.failCause(Cause.fail('error'))
   * const effect: Effect.Effect<never, string, readonly never[]> = Fx.runCollectAll(stream)
   * const result: Either.Either<string, readonly never[]> = await Effect.runPromiseEither(effect)
   *
   * assert.deepStrictEqual(result, Either.left('error'))
   */
  failCause,
  /**
   * Construct a Fx from an Generator of Effects returning an Fx.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   *
   * const stream: Fx.Fx<never, never, number> = Fx.gen(function* ($) {
   *   // Run any number of Effect before returning an Fx
   *   const x = yield* $(Effect.succeed(1))
   *   const y = yield* $(Effect.succeed(2))
   *
   *   return Fx.succeed(x + y)
   * })
   *
   * const effect: Effect.Effect<never, never, readonly number[]> = Fx.runCollectAll(stream)
   * const result: readonly number[] = await Effect.runPromise(effect)
   *
   * assert.deepStrictEqual(result, [3])
   */
  gen,
  /**
   * Construct a successful Fx from a value.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   *
   * const stream: Fx.Fx<never, never, number> = Fx.succeed(42)
   * const effect: Effect.Effect<never, never, readonly number[]> = Fx.runCollectAll(stream)
   * const result: readonly number[] = await Effect.runPromise(effect)
   *
   * assert.deepStrictEqual(result, [42])
   */
  succeed,
  /**
   * Lazily construct an Fx from a function that can possibly fail.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Effect from '@effect/io/Effect'
   * import * as Exit from '@effect/io/Exit'
   * import * as Fx from '@typed/fx'
   *
   * const value = Math.random()
   * const error = new Error('Uh-oh')
   * const stream: Fx.Fx<never, never, number> = Fx.suspend(() => {
   *   if (value > 0.5) {
   *     throw error
   *   }
   *
   *   return Fx.succeed(value)
   * })
   * const effect: Effect.Effect<never, never, readonly number[]> = Fx.runCollectAll(stream)
   * const result: Exit.Exit<never, readonly number[]> = await Effect.runPromiseExit(effect)
   *
   * if (value > 0.5) {
   *   assert.deepStrictEqual(result, Exit.die(error))
   * } else {
   *   assert.deepStrictEqual(result, Exit.succeed([value]))
   * }
   */
  suspend,
  /**
   * Lazily construct an Fx from a function that will not fail.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   *
   * const stream: Fx.Fx<never, never, number> = Fx.suspendSucceed(() => Fx.succeed(42))
   * const effect: Effect.Effect<never, never, readonly number[]> = Fx.runCollectAll(stream)
   * const result: readonly number[] = await Effect.runPromise(effect)
   *
   * assert.deepStrictEqual(result, [42])
   */
  suspend as suspendSucceed
} from "./internal/constructor/index"

export {
  /**
   * Delay all of the events of an Fx by a specific duration.
   * @since 1.0.0
   * @category Operator
   * @example
   * import * as assert from 'assert'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   * import * as Duration from '@effect/data/Duration'
   *
   * const stream: Fx.Fx<never, never, number> = Fx.delay(Fx.succeed(42), Duration.millis(1000))
   * const effect: Effect.Effect<never, never, readonly number[]> = Fx.runCollectAll(stream)
   * const result: readonly number[] = await Effect.runPromise(effect)
   *
   * assert.deepStrictEqual(result, [42])
   */
  delay,
  /**
   * Construct an Fx from the values of another Fx that and "flatten" them back into
   * the current Fx.
   * @since 1.0.0
   * @category Operator
   */
  flatMap,
  /**
   * Flatten an Fx of Fx into a single Fx.
   * @since 1.0.0
   * @category Operator
   */
  flatten,
  /**
   * Effeciently share an underlying Fx with multiple observers and replay
   * the latest value, when available, to late subscribers.
   * @since 1.0.0
   * @category Operator
   */
  hold,
  /**
   * Detect if an Fx is a MapFx instance. Useful for creating fusion optimizations.
   * @since 1.0.0
   * @category Type Guard
   */
  isMap,
  /**
   * Transform the values of an Fx.
   * @since 1.0.0
   * @category Operator
   */
  map,
  /**
   * Merge together 2 Fx instances into a single Fx that emits all of their
   * values as soon as possible.
   * @since 1.0.0
   * @category Operator
   */
  merge,
  /**
   * Merge together multiple Fx instances into a single Fx that emits all of their
   * values as soon as possible.
   * @since 1.0.0
   * @category Operator
   */
  mergeAll,
  /**
   * Effeciently share an underlying Fx with multiple observers.
   * @since 1.0.0
   * @category Operator
   */
  multicast
} from "./internal/operator/index"

export {
  /**
   * Activate an Fx.
   * @since 1.0.0
   * @category Run
   */
  drain,
  /**
   * Listen to the events of an Fx and run an Effect for each event.
   * The resulting Effect will resolve with any error that has been raised
   * or successfully with void.
   * @since 1.0.0
   * @category Run
   */
  observe,
  /**
   * Collect all the values of an Fx into an Array
   * @since 1.0.0
   * @category Run
   */
  toChunk as runCollectAll
} from "./internal/run/index"

export {
  /**
   * Construct a Fx from an array of values.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   *
   * const stream: Fx.Fx<never, never, number> = Fx.fromArray([1, 2, 3])
   * const effect: Effect.Effect<never, never, readonly number[]> = Fx.runCollectAll(stream)
   * const result: readonly number[] = await Effect.runPromise(effect)
   *
   * assert.deepStrictEqual(result, [1, 2, 3])
   */
  fromArray,
  /**
   * Construct a Fx from an Effect.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   *
   * const stream: Fx.Fx<never, never, number> = Fx.fromEffect(Effect.succeed(42))
   * const effect: Effect.Effect<never, never, readonly number[]> = Fx.runCollectAll(stream)
   * const result: readonly number[] = await Effect.runPromise(effect)
   *
   * assert.deepStrictEqual(result, [42])
   */
  fromEffect,
  /**
   * Construct a Fx from an Effect returning an Fx.
   * @since 1.0.0
   * @category Constructor
   * @example
   * import * as assert from 'assert'
   * import * as Effect from '@effect/io/Effect'
   * import * as Fx from '@typed/fx'
   *
   * const stream: Fx.Fx<never, never, number> = Fx.fromFxEffect(Effect.succeed(Fx.succeed(42)))
   * const effect: Effect.Effect<never, never, readonly number[]> = Fx.runCollectAll(stream)
   * const result: readonly number[] = await Effect.runPromise(effect)
   *
   * assert.deepStrictEqual(result, [42])
   */
  fromFxEffect
} from "./internal/conversion/index"
