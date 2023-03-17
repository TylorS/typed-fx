import type { Fx, Sink } from "@typed/fx/Fx"
import type { Context } from "@typed/fx/internal/_externals"
import { Debug, Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const serviceWithFx: {
  <A, R2, E2, B>(tag: Context.Tag<A>, f: (a: A) => Fx<R2, E2, B>): Fx<R2 | A, E2, B>
  <A, R2, E2, B>(f: (a: A) => Fx<R2, E2, B>): (tag: Context.Tag<A>) => Fx<R2 | A, E2, B>
} = Debug.dualWithTrace(
  2,
  (trace) =>
    <A, R2, E2, B>(tag: Context.Tag<A>, f: (a: A) => Fx<R2, E2, B>) =>
      new ServiceWithFx(tag, f).transform((e) => e.traced(trace))
)

export class ServiceWithFx<A, R, E, B> extends BaseFx<R | A, E, B> {
  readonly name = "ServiceWithFx" as const

  constructor(readonly tag: Context.Tag<A>, readonly f: (a: A) => Fx<R, E, B>) {
    super()
  }

  run(sink: Sink<E, B>) {
    return Effect.serviceWithEffect(this.tag, (a) => this.f(a).run(sink))
  }
}
