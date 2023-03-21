import { bodyWithTrace } from "@effect/io/Debug"
import type { Fx, Sink } from "@typed/fx/Fx"
import { Effect } from "@typed/fx/internal/_externals"
import type { Context } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const contextWithFx: <R, R2, E2, A>(
  f: (context: Context.Context<R>) => Fx<R2, E2, A>
) => Fx<R | R2, E2, A> = bodyWithTrace((
  trace
) => (f) => new ContextWithFx(f).traced(trace))

export class ContextWithFx<R, R2, E2, A> extends BaseFx<R | R2, E2, A> {
  readonly name = "ContextWithFx"

  constructor(readonly f: (context: Context.Context<R>) => Fx<R2, E2, A>) {
    super()
  }

  run(sink: Sink<E2, A>) {
    return Effect.contextWithEffect((context: Context.Context<R>) => this.f(context).run(sink))
  }
}
