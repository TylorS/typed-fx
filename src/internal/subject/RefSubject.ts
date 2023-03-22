import { equals } from "@effect/data/Equal"
import * as MutableRef from "@effect/data/MutableRef"
import * as RA from "@effect/data/ReadonlyArray"
import * as RR from "@effect/data/ReadonlyRecord"
import * as Equivalence from "@effect/data/typeclass/Equivalence"
import { dualWithTrace } from "@effect/io/Debug"
import type { RuntimeFiber } from "@effect/io/Fiber"
import type { Fx, Sink } from "@typed/fx/Fx"
import type { Context, Scope } from "@typed/fx/internal/_externals"
import { Effect, Fiber, Option, pipe } from "@typed/fx/internal/_externals"
import { observe_ } from "@typed/fx/internal/run"
import { HoldSubjectImpl } from "@typed/fx/internal/subject/HoldSubject"
import type { Subject } from "@typed/fx/internal/subject/Subject"

/**
 * A RefSubject is a lazily-instantiated Reference to a value. It also
 * implements
 */
export interface RefSubject<in out E, in out A> extends Subject<E, A> {
  readonly [RefSubject.TypeId]: RefSubject.TypeId

  readonly eq: Equivalence.Equivalence<A>

  // Ref methods

  /**
   * Get the current value of the Ref. The value will be initialized if it hasn't
   * been already.
   */
  readonly get: Effect.Effect<never, E, A>

  /**
   * Set the current value of the Ref. Cannot fail because no value needs
   * to be initialized.
   */
  readonly set: (a: A) => Effect.Effect<never, never, A>

  /**
   * Modify the current value of the Ref with the specified effectful function.
   * The current value will be initialized if it hasn't been already.
   */
  readonly modifyEffect: <R2, E2, B>(
    f: (a: A) => Effect.Effect<R2, E2, readonly [B, A]>
  ) => Effect.Effect<R2, E | E2, B>

  /**
   * Modify the current value of the Ref with the specified function. The current
   * value will be initialized if it hasn't been already.
   */
  readonly modify: <B>(
    f: (a: A) => readonly [B, A]
  ) => Effect.Effect<never, E, B>

  /**
   * Update the current value of the Ref with the specified effectful function.
   * The current value will be initialized if it hasn't been already.
   */
  readonly updateEffect: <R2, E2>(
    f: (a: A) => Effect.Effect<R2, E2, A>
  ) => Effect.Effect<R2, E | E2, A>

  /**
   * Update the current value of the Ref with the specified function. The current
   * value will be initialized if it hasn't been already.
   */
  readonly update: (f: (a: A) => A) => Effect.Effect<never, E, A>

  /**
   * Delete the current value of the Ref. Option.none() will be returned if the
   * has not been initialized yet. Option.some(a) will be returned if the Ref
   * has been initialized previously.
   */
  readonly delete: Effect.Effect<never, never, Option.Option<A>>

  // Computed methods

  /**
   * Compute a value from the current value of the Ref with an Effect.
   */
  readonly mapEffect: <R2, E2, B>(
    f: (a: A) => Effect.Effect<R2, E2, B>
  ) => Effect.Effect<R2 | Scope.Scope, never, Computed<E | E2, B>>

  /**
   * Compute a value from the current value of the Ref.
   */
  readonly map: <B>(
    f: (a: A) => B
  ) => Effect.Effect<Scope.Scope, never, Computed<E, B>>
}

export function makeRef<R, E, A>(
  initialize: Effect.Effect<R, E, A>,
  eq: Equivalence.Equivalence<A> = equals
): Effect.Effect<R, never, RefSubject<E, A>> {
  return Effect.contextWith((ctx: Context.Context<R>) =>
    RefSubject.unsafeMake(Effect.provideContext(initialize, ctx), eq)
  )
}

export function makeScopedRef<R, E, A>(
  initialize: Effect.Effect<R, E, A>,
  eq: Equivalence.Equivalence<A> = equals
): Effect.Effect<R | Scope.Scope, never, RefSubject<E, A>> {
  return Effect.gen(function*($) {
    const subject = yield* $(makeRef(initialize, eq))

    yield* $(Effect.addFinalizer(subject.end))

    return subject
  })
}

export namespace RefSubject {
  export const TypeId = Symbol.for("@typed/fx/RefSubject")
  export type TypeId = typeof TypeId

  export type Any = RefSubject<any, any> | RefSubject<never, any>

  export function unsafeMake<E, A>(
    initialize: Effect.Effect<never, E, A>,
    eq: Equivalence.Equivalence<A>
  ): RefSubject<E, A> {
    return new RefSubjectImpl<E, A>(
      initialize,
      eq,
      MutableRef.make(Option.none<A>())
    )
  }

  export function struct<P extends Readonly<Record<string, Any>>>(
    properties: P
  ): Effect.Effect<
    Scope.Scope,
    never,
    RefSubject<
      Fx.ErrorsOf<P[string]>,
      { readonly [K in keyof P]: Fx.OutputOf<P[K]> }
    >
  > {
    type Val = { readonly [K in keyof P]: Fx.OutputOf<P[K]> }

    return Effect.gen(function*($) {
      const ref = yield* $(
        makeRef(
          Effect.allPar(
            RR.map(properties, (property) => property.get)
          ) as Effect.Effect<never, Fx.ErrorsOf<P[string]>, Val>,
          Equivalence.struct(RR.map(properties, (property) => property.eq))
        )
      )

      yield* $(
        ref.forkObserve((a) => Effect.allPar(RR.map(a, (x, i) => properties[i].set(x))))
      )

      yield* $(
        Effect.forkScoped(
          Effect.allPar(
            RR.map(properties, (property, k) =>
              Effect.catchAllCause(
                property.observe((x) => ref.update((y) => ({ ...y, [k]: x }))),
                ref.error
              ))
          )
        )
      )

      yield* $(Effect.yieldNow())

      return ref
    })
  }

  export function tuple<P extends RA.NonEmptyReadonlyArray<Any>>(
    ...properties: P
  ): Effect.Effect<
    Scope.Scope,
    never,
    RefSubject<
      Fx.ErrorsOf<P[number]>,
      { readonly [K in keyof P]: Fx.OutputOf<P[K]> }
    >
  > {
    type Val = { readonly [K in keyof P]: Fx.OutputOf<P[K]> }

    return Effect.gen(function*($) {
      const ref = yield* $(
        makeRef(
          Effect.allPar(
            RA.map(properties, (property) => property.get)
          ) as Effect.Effect<never, Fx.ErrorsOf<P[number]>, Val>,
          Equivalence.tuple(
            ...RA.mapNonEmpty(properties, (property) => property.eq)
          )
        )
      )

      yield* $(
        ref.forkObserve(
          (a) =>
            Effect.allPar(
              RA.map(a, (x, i) => properties[i].set(x))
            ) as Effect.Effect<never, never, Val>
        )
      )

      yield* $(
        Effect.forkScoped(
          Effect.allPar(
            RA.map(properties, (property, k) =>
              Effect.catchAllCause(
                property.observe((x) =>
                  ref.update((y) => {
                    const next = y.slice(0)
                    next[k] = x
                    return next as Val
                  })
                ),
                ref.error
              ))
          )
        )
      )

      yield* $(Effect.yieldNow())

      return ref
    })
  }

  class RefSubjectImpl<E, A> extends HoldSubjectImpl<E, A, "RefSubject"> implements RefSubject<E, A> {
    readonly [TypeId]: TypeId = TypeId

    // Ensure all modifications happen in FIFO order
    protected lock = Effect.unsafeMakeSemaphore(1).withPermits(1)
    // Ensure only one fiber is initializing the value
    protected initFiber = MutableRef.make<RuntimeFiber<E, A> | null>(null)

    constructor(
      readonly initialize: Effect.Effect<never, E, A>,
      readonly eq: Equivalence.Equivalence<A>,
      readonly current: MutableRef.MutableRef<Option.Option<A>>
    ) {
      super(current, "RefSubject")
    }

    run(sink: Sink<E, A>) {
      return pipe(
        // Ensure Ref is initialized
        Effect.catchAllCause(this.get, sink.error),
        Effect.zipRight(super.run(sink))
      )
    }

    event(a: A) {
      return this.set(a)
    }

    readonly get: Effect.Effect<never, E, A> = Effect.suspend(() => {
      const current = MutableRef.get(this.current)

      if (Option.isSome(current)) {
        return Effect.succeed(current.value)
      }

      const fiberOrNull = MutableRef.get(this.initFiber)

      if (fiberOrNull) {
        return Fiber.join<E, A>(fiberOrNull)
      }

      return this.lock(
        Effect.flatMap(Effect.fork(this.initialize), (actualFiber) => {
          MutableRef.set(this.initFiber, actualFiber)

          return pipe(
            Fiber.join(actualFiber),
            Effect.ensuring(
              Effect.sync(() => MutableRef.set(this.initFiber, null))
            ),
            Effect.tap((a) => Effect.sync(() => MutableRef.set(this.current, Option.some(a))))
          )
        })
      )
    })

    modifyEffect<R2, E2, B>(
      f: (a: A) => Effect.Effect<R2, E2, readonly [B, A]>
    ): Effect.Effect<R2, E | E2, B> {
      return Effect.flatMap(
        this.get,
        (currentValue) => Effect.flatMap(f(currentValue), ([b, a]) => Effect.as(this.setAndSend(a), b))
      )
    }

    modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, E, B> {
      return this.modifyEffect((a) => Effect.sync(() => f(a)))
    }

    set(a: A): Effect.Effect<never, never, A> {
      return this.lock(this.setAndSend(a))
    }

    updateEffect<R2, E2>(
      f: (a: A) => Effect.Effect<R2, E2, A>
    ): Effect.Effect<R2, E | E2, A> {
      return this.modifyEffect((a) => Effect.map(f(a), (a) => [a, a]))
    }

    update(f: (a: A) => A): Effect.Effect<never, E, A> {
      return this.updateEffect((a) => Effect.sync(() => f(a)))
    }

    get delete() {
      return this.lock(
        Effect.sync(() => {
          const { current } = this
          const option = MutableRef.get(current)

          MutableRef.set(current, Option.none<A>())

          return option
        })
      )
    }

    mapEffect<R2, E2, B>(
      f: (a: A) => Effect.Effect<R2, E2, B>
    ): Effect.Effect<R2 | Scope.Scope, never, Computed<E | E2, B>> {
      return makeComputed(this, f)
    }

    map<B>(f: (a: A) => B): Effect.Effect<Scope.Scope, never, Computed<E, B>> {
      return this.mapEffect((a) => Effect.sync(() => f(a)))
    }

    protected setAndSend(a: A): Effect.Effect<never, never, A> {
      return Effect.suspend(() => {
        const current = MutableRef.get(this.current)

        if (Option.isSome(current) && this.eq(current.value, a)) {
          return Effect.succeed(a)
        }

        MutableRef.set(this.current, Option.some(a))

        return Effect.as(super.event(a), a)
      })
    }
  }
}

/**
 * A Computed is a readonly view of a current value that is computed from
 * the current value of a RefSubject.
 */
export interface Computed<E, A> extends Fx<never, E, A> {
  /**
   * The current value of the Computed.
   */
  readonly get: Effect.Effect<never, E, A>

  /**
   * Compute a new value from the current value of the Computed with an Effect.
   */
  readonly mapEffect: <R2, E2, B>(
    f: (a: A) => Effect.Effect<R2, E2, B>
  ) => Effect.Effect<R2 | Scope.Scope, never, Computed<E | E2, B>>

  /**
   * Compute a new value from the current value of the Computed.
   */
  readonly map: <B>(
    f: (a: A) => B
  ) => Effect.Effect<Scope.Scope, never, Computed<E, B>>
}

export const makeComputed: {
  <E, A, R2, E2, B>(
    ref: RefSubject<E, A>,
    f: (a: A) => Effect.Effect<R2, E2, B>
  ): Effect.Effect<R2 | Scope.Scope, never, Computed<E | E2, B>>

  <A, R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>): <E>(
    ref: RefSubject<E, A>
  ) => Effect.Effect<R2 | Scope.Scope, never, Computed<E | E2, B>>
} = dualWithTrace(
  2,
  (trace) =>
    function makeComputed<E, A, R2, E2, B>(
      ref: RefSubject<E, A>,
      f: (a: A) => Effect.Effect<R2, E2, B>
    ): Effect.Effect<R2 | Scope.Scope, never, Computed<E | E2, B>> {
      return Effect.gen(function*($) {
        const computed = yield* $(makeRef(Effect.flatMap(ref.get, f)))

        yield* $(
          Effect.forkScoped(
            Effect.matchCauseEffect(
              observe_(ref, (a) => computed.updateEffect(() => f(a))),
              computed.error,
              computed.end
            )
          )
        )

        return computed
      }).traced(trace)
    }
)
