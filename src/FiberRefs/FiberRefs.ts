/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Just, Maybe, Nothing, isJust } from 'hkt-ts/Maybe'

import { Fiber } from '@/Fiber/Fiber'
import * as FiberRef from '@/FiberRef/index'
import { Fx, Of } from '@/Fx/Fx'
import { fork } from '@/Fx/InstructionSet/Fork'
import { fromExit, success } from '@/Fx/InstructionSet/FromExit'
import { join } from '@/Fx/join'
import { fromLazy, lazy } from '@/Fx/lazy'
import { Lock, Semaphore, acquire } from '@/Semaphore/Semaphore'

export class FiberRefs {
  #fibers = new Map<FiberRef.AnyFiberRef, Fiber<any, any>>()
  #semaphores = new Map<FiberRef.AnyFiberRef, Semaphore>()

  constructor(readonly references: Map<FiberRef.AnyFiberRef, any>) {}

  readonly getMaybe: <R extends FiberRef.AnyFiberRef>(ref: R) => Of<Maybe<FiberRef.OutputOf<R>>> = (
    ref,
  ) => fromLazy(() => (this.references.has(ref) ? Just(this.references.get(ref)) : Nothing))

  readonly get: <R extends FiberRef.AnyFiberRef>(
    ref: R,
  ) => Fx<FiberRef.ResourcesOf<R>, FiberRef.ErrorsOf<R>, FiberRef.OutputOf<R>> = <
    R extends FiberRef.AnyFiberRef,
  >(
    ref: R,
  ) =>
    lazy(() => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this

      return Fx(function* () {
        const current = yield* self.getMaybe(ref)

        if (isJust(current)) {
          return current.value
        }

        if (self.#fibers.has(ref)) {
          const fiber = self.#fibers.get(ref) as Fiber<FiberRef.ErrorsOf<R>, FiberRef.OutputOf<R>>
          const exit = yield* fiber.exit

          return yield* fromExit(exit)
        }

        const fiber = yield* fork(
          ref.initial as Fx<FiberRef.ResourcesOf<R>, FiberRef.ErrorsOf<R>, FiberRef.OutputOf<R>>,
        )

        self.#fibers.set(ref, fiber)

        const value = yield* join(fiber)

        self.references.set(ref, value)

        return value
      })
    })

  readonly modify: <R extends FiberRef.AnyFiberRef, R2, E2, B>(
    ref: R,
    f: (a: FiberRef.OutputOf<R>) => Fx<R2, E2, readonly [B, FiberRef.OutputOf<R>]>,
  ) => Fx<FiberRef.ResourcesOf<R> | R2, FiberRef.ErrorsOf<R> | E2, B> = (ref, f) =>
    lazy(() => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this

      return this.runWithSemaphore(
        ref,
        Fx(function* () {
          const [b, updated] = yield* f(yield* self.get(ref))

          self.references.set(ref, updated)

          return b
        }),
      )
    })

  /**
   * Fork
   */
  readonly fork: Of<FiberRefs> = lazy(() => {
    const refs = this.references
    const references = new Map<FiberRef.AnyFiberRef, any>()

    for (const [k, v] of this.references) {
      const maybe = k.fork(v)

      if (isJust(maybe)) {
        refs.set(k, maybe.value)
      }
    }

    return success(new FiberRefs(references))
  })

  readonly join = (other: FiberRefs) =>
    lazy(() => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this

      return Fx(function* () {
        for (const [k, v] of other.references) {
          const local = yield* self.getMaybe(k)

          self.references.set(k, isJust(local) ? k.join(local.value, v) : v)
        }

        return self
      })
    })

  protected runWithSemaphore<REF extends FiberRef.AnyFiberRef, R, E, A>(
    ref: REF,
    fx: Fx<R, E, A>,
  ): Fx<R, E, A> {
    const semaphore =
      this.#semaphores.get(ref) ?? (this.#semaphores.set(ref, new Lock()).get(ref) as Semaphore)

    return acquire(semaphore)(fx)
  }
}
