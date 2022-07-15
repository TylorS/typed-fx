/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Just, Maybe, Nothing, isJust } from 'hkt-ts/Maybe'

import { Fiber } from '@/Fiber/Fiber'
import { AnyFiberRef } from '@/FiberRef/index'
import { Fx, Of } from '@/Fx/Fx'
import { fork } from '@/Fx/InstructionSet/Fork'
import { fromExit, success } from '@/Fx/InstructionSet/FromExit'
import { join } from '@/Fx/join'
import { fromLazy, lazy } from '@/Fx/lazy'
import * as Ref from '@/Ref/Ref'

export class FiberRefs {
  #fibers = new Map<AnyFiberRef, Fiber<any, any>>()

  constructor(readonly references: Map<AnyFiberRef, any>) {}

  readonly getMaybe: <R extends AnyFiberRef>(ref: R) => Of<Maybe<Ref.OutputOf<R>>> = (ref) =>
    fromLazy(() => (this.references.has(ref) ? Just(this.references.get(ref)) : Nothing))

  readonly get: <R extends AnyFiberRef>(
    ref: R,
  ) => Fx<Ref.ResourcesOf<R>, Ref.ErrorsOf<R>, Ref.OutputOf<R>> = <R extends AnyFiberRef>(ref: R) =>
    lazy(() => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this

      return Fx(function* () {
        const current = yield* self.getMaybe(ref)

        if (isJust(current)) {
          return current.value
        }

        if (self.#fibers.has(ref)) {
          const fiber = self.#fibers.get(ref) as Fiber<Ref.ErrorsOf<R>, Ref.OutputOf<R>>
          const exit = yield* fiber.exit

          return yield* fromExit(exit)
        }

        const fiber = yield* fork(
          ref.initial as Fx<Ref.ResourcesOf<R>, Ref.ErrorsOf<R>, Ref.OutputOf<R>>,
        )

        self.#fibers.set(ref, fiber)

        const value = yield* join(fiber)

        self.references.set(ref, value)

        return value
      }) as Fx<Ref.ResourcesOf<R>, Ref.ErrorsOf<R>, Ref.OutputOf<R>>
    })

  readonly modify: <R extends AnyFiberRef, B>(
    ref: R,
    f: (a: Ref.OutputOf<R>) => readonly [B, Ref.OutputOf<R>],
  ) => Fx<Ref.ResourcesOf<R>, Ref.ErrorsOf<R>, readonly [B, Ref.OutputOf<R>]> = (ref, f) =>
    lazy(() => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this

      return Fx(function* () {
        const updated = f(yield* self.get(ref))

        self.references.set(ref, updated[1])

        return updated
      })
    })

  /**
   * Fork
   */
  readonly fork: Of<FiberRefs> = lazy(() => {
    const refs = this.references
    const references = new Map<AnyFiberRef, any>()

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
}
