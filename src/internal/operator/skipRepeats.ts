import { equals } from "@effect/data/Equal"
import * as MutableRef from "@effect/data/MutableRef"
import type { Equivalence } from "@effect/data/typeclass/Equivalence"
import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import { Effect, Option } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export function skipRepeatsWith<A>(eq: Equivalence<A>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R, E, A> => new SkipRepeatsWithFx(fx, eq)
}

export function skipRepeats<R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> {
  return skipRepeatsWith<A>(equals)(fx)
}

class SkipRepeatsWithFx<R, E, A> extends BaseFx<R, E, A> {
  readonly name = "SkipRepeatsWith" as const

  constructor(readonly fx: Fx<R, E, A>, readonly eq: Equivalence<A>) {
    super()
  }

  run(sink: Sink<E, A>) {
    return Effect.suspend(() => {
      const previous = MutableRef.make(Option.none<A>())

      return this.fx.run(Sink(
        (a) =>
          Effect.suspend(() => {
            const prev = MutableRef.get(previous)

            if (Option.isSome(prev) && this.eq(prev.value, a)) {
              return Effect.unit()
            }

            MutableRef.set(previous, Option.some(a))

            return sink.event(a)
          }),
        sink.error,
        sink.end
      ))
    })
  }
}
