import { equals } from "@effect/data/Equal"
import * as MutableRef from "@effect/data/MutableRef"
import type { Equivalence } from "@effect/data/typeclass/Equivalence"
import { dualWithTrace } from "@effect/io/Debug"
import type { RuntimeFiber } from "@effect/io/Fiber"
import type { Fx } from "@typed/fx/Fx"
import type { Context, Scope } from "@typed/fx/internal/_externals"
import { Effect, Fiber, Option } from "@typed/fx/internal/_externals"
import { observe_ } from "@typed/fx/internal/run"
import { HoldSubjectImpl } from "@typed/fx/internal/subject/HoldSubject"
import type { Subject } from "@typed/fx/internal/subject/Subject"

/**
 * A RefSubject is a lazily-instantiated Reference to a value. It also
 * implements
 */
export interface RefSubject<E, A> extends Subject<E, A> {
  readonly [RefSubject.TypeId]: RefSubject.TypeId

  readonly get: Effect.Effect<never, E, A>
  readonly set: (a: A) => Effect.Effect<never, E, A>
  readonly modifyEffect: <R2, E2, B>(
    f: (a: A) => Effect.Effect<R2, E2, readonly [B, A]>
  ) => Effect.Effect<R2, E | E2, B>
  readonly modify: <B>(f: (a: A) => readonly [B, A]) => Effect.Effect<never, E, B>
  readonly updateEffect: <R2, E2>(f: (a: A) => Effect.Effect<R2, E2, A>) => Effect.Effect<R2, E | E2, A>
  readonly update: (f: (a: A) => A) => Effect.Effect<never, E, A>
  readonly delete: Effect.Effect<never, never, Option.Option<A>>

  readonly mapEffect: <R2, E2, B>(
    f: (a: A) => Effect.Effect<R2, E2, B>
  ) => Effect.Effect<R2 | Scope.Scope, never, Computed<E | E2, B>>

  readonly map: <B>(f: (a: A) => B) => Effect.Effect<Scope.Scope, never, Computed<E, B>>
}

export function makeRef<R, E, A>(
  initialize: Effect.Effect<R, E, A>,
  eq: Equivalence<A> = equals
): Effect.Effect<R, never, RefSubject<E, A>> {
  return Effect.contextWith((ctx: Context.Context<R>) =>
    RefSubject.unsafeMake(Effect.provideContext(initialize, ctx), eq)
  )
}

export function makeScopedRef<R, E, A>(
  initialize: Effect.Effect<R, E, A>,
  eq: Equivalence<A> = equals
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

  export function unsafeMake<E, A>(initialize: Effect.Effect<never, E, A>, eq: Equivalence<A>): RefSubject<E, A> {
    return new RefSubjectImpl<E, A>(initialize, eq, MutableRef.make(Option.none<A>()))
  }

  class RefSubjectImpl<E, A> extends HoldSubjectImpl<E, A, "RefSubject"> implements RefSubject<E, A> {
    readonly [TypeId]: TypeId = TypeId

    // Ensure all modifications happen in FIFO order
    protected lock = Effect.unsafeMakeSemaphore(1).withPermits(1)
    // Ensure only one fiber is initializing the value
    protected initFiber = MutableRef.make<RuntimeFiber<E, A> | null>(null)

    constructor(
      readonly initialize: Effect.Effect<never, E, A>,
      readonly eq: Equivalence<A>,
      readonly current: MutableRef.MutableRef<Option.Option<A>>
    ) {
      super(current, "RefSubject")
    }

    event(a: A) {
      return this.lock(this.setAndSend(a))
    }

    readonly get: Effect.Effect<never, E, A> = Effect.suspendSucceed(() => {
      const value = MutableRef.get(this.current)

      if (Option.isSome(value)) {
        return Effect.succeed(value.value)
      }

      const fiberOrNull = MutableRef.get(this.initFiber)

      if (fiberOrNull) {
        return Fiber.join<E, A>(fiberOrNull)
      }

      return Effect.flatMap(Effect.forkDaemon(this.initialize), (actualFiber) => {
        MutableRef.set(this.initFiber, actualFiber)

        return Effect.tap(
          Effect.ensuring(
            Fiber.join(actualFiber),
            Effect.sync(() => {
              MutableRef.set(this.initFiber, null)
            })
          ),
          (a) =>
            Effect.sync(() => {
              MutableRef.set(this.current, Option.some(a))
            })
        )
      })
    })

    modifyEffect<R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, readonly [B, A]>): Effect.Effect<R2, E | E2, B> {
      const { eq, setAndSend } = this

      return this.lock(
        Effect.flatMap(
          this.get,
          (currentValue) =>
            Effect.flatMap(f(currentValue), ([b, a]) =>
              Effect.suspendSucceed(() => {
                if (eq(currentValue, a)) {
                  return Effect.succeed(b)
                }

                return Effect.as(setAndSend(a), b)
              }))
        )
      )
    }

    modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, E, B> {
      return this.modifyEffect((a) => Effect.sync(() => f(a)))
    }

    set(a: A): Effect.Effect<never, E, A> {
      return this.modify(() => [a, a])
    }

    updateEffect<R2, E2>(f: (a: A) => Effect.Effect<R2, E2, A>): Effect.Effect<R2, E | E2, A> {
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

    protected setAndSend = (a: A) => {
      return Effect.suspendSucceed(() => {
        MutableRef.set(this.current, Option.some(a))

        return super.event(a)
      })
    }
  }
}

export interface Computed<E, A> extends Fx<never, E, A> {
  readonly get: Effect.Effect<never, E, A>
}

export const makeComputed: {
  <E, A, R2, E2, B>(
    ref: RefSubject<E, A>,
    f: (a: A) => Effect.Effect<R2, E2, B>
  ): Effect.Effect<R2 | Scope.Scope, never, Computed<E | E2, B>>

  <A, R2, E2, B>(
    f: (a: A) => Effect.Effect<R2, E2, B>
  ): <E>(ref: RefSubject<E, A>) => Effect.Effect<R2 | Scope.Scope, never, Computed<E | E2, B>>
} = dualWithTrace(2, (trace) =>
  function makeComputed<E, A, R2, E2, B>(
    ref: RefSubject<E, A>,
    f: (a: A) => Effect.Effect<R2, E2, B>
  ): Effect.Effect<R2 | Scope.Scope, never, Computed<E | E2, B>> {
    return Effect.gen(function*($) {
      const computed = yield* $(makeRef(Effect.flatMap(ref.get, f)))

      yield* $(
        Effect.forkScoped(Effect.catchAllCause(observe_(ref, (a) => computed.updateEffect(() => f(a))), computed.error))
      )

      return computed
    }).traced(trace)
  })
