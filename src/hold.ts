import { Effect, MutableRef, Option } from "@typed/fx/externals"
import type { Fx, Sink } from "@typed/fx/Fx"
import { MulticastFx } from "@typed/fx/multicast"

export function hold<R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> {
  return new HoldFx(fx)
}

export class HoldFx<R, E, A> extends MulticastFx<R, E, A> {
  protected current = MutableRef.make(Option.none<A>())

  constructor(public fx: Fx<R, E, A>) {
    super(fx)
  }

  run<R2>(sink: Sink<R2, E, A>) {
    const current = MutableRef.get(this.current)

    if (Option.isSome(current)) {
      return Effect.flatMap(sink.event(current.value), () => super.run(sink))
    }

    return super.run(sink)
  }

  event(a: A) {
    return Effect.suspend(() => {
      MutableRef.set(this.current, Option.some(a))

      return super.event(a)
    })
  }
}
