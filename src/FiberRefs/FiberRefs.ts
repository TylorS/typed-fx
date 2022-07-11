/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Just, Maybe, Nothing, isJust } from 'hkt-ts/Maybe'

import { Fiber } from '@/Fiber/Fiber'
import { AnyFiberRef } from '@/FiberRef/index'
import { Fx, Of } from '@/Fx/Fx'
import { fork } from '@/Fx/InstructionSet/Fork'
import { fromLazy, lazy } from '@/Fx/InstructionSet/FromLazy'
import { join } from '@/Fx/InstructionSet/Join'
import { fromExit, success } from '@/Fx/index'
import { ExtractErrors, ExtractOutput, ExtractResources } from '@/Ref/Ref'

export class FiberRefs {
  #fibers = new Map<AnyFiberRef, Fiber<any, any>>()

  constructor(readonly references: Map<AnyFiberRef, any>) {}

  readonly getMaybe: <R extends AnyFiberRef>(ref: R) => Of<Maybe<ExtractOutput<R>>> = (ref) =>
    fromLazy(() => (this.references.has(ref) ? Just(this.references.get(ref)) : Nothing))

  readonly get: <R extends AnyFiberRef>(
    ref: R,
  ) => Fx<ExtractResources<R>, ExtractErrors<R>, ExtractOutput<R>> = <R extends AnyFiberRef>(
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
          const fiber = self.#fibers.get(ref) as Fiber<ExtractErrors<R>, ExtractOutput<R>>
          const exit = yield* fiber.exit

          return yield* fromExit(exit)
        }

        const fiber = yield* fork(
          ref.initial as unknown as Fx<ExtractResources<R>, ExtractErrors<R>, ExtractOutput<R>>,
        )

        self.#fibers.set(ref, fiber)

        const value = yield* join(fiber)

        self.references.set(ref, value)

        return value
      })
    })

  readonly modify: <R extends AnyFiberRef, B>(
    ref: R,
    f: (a: ExtractOutput<R>) => readonly [B, ExtractOutput<R>],
  ) => Fx<ExtractResources<R>, ExtractErrors<R>, readonly [B, ExtractOutput<R>]> = (ref, f) =>
    lazy(() => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this

      return Fx(function* () {
        const updated = f(yield* self.get(ref))

        self.references.set(ref, updated[1])

        return updated
      })
    }) as any

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
