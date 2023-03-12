import { dualWithTrace } from "@effect/io/Debug"
import type { Fx, Sink } from "@typed/fx/Fx"
import type { Scope } from "@typed/fx/internal/_externals"
import { Context, Effect } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const contramapContext: {
  <R1, R2, E, A>(
    fx: Fx<R2, E, A>,
    f: (r: Context.Context<R1>) => Context.Context<R2>
  ): Fx<R1, E, A>

  <R1, R2>(
    f: (r: Context.Context<R1>) => Context.Context<R2>
  ): <E, A>(fx: Fx<R2, E, A>) => Fx<R1, E, A>
} = dualWithTrace(2, (trace, restore) =>
  <R1, R2, E, A>(
    fx: Fx<R2, E, A>,
    f: (r: Context.Context<R1>) => Context.Context<R2>
  ): Fx<R1, E, A> => new ContramapContextFx(fx, restore(f)).traced(trace))

export class ContramapContextFx<R1, R2, E, A> extends BaseFx<R1, E, A> {
  readonly _tag = "ContramapContext"

  constructor(readonly fx: Fx<R2, E, A>, readonly f: (r: Context.Context<R1>) => Context.Context<R2>) {
    super()
  }

  run<R3>(sink: Sink<R3, E, A>) {
    return Effect.contramapContext(
      this.fx.run(sink),
      // TODO: Is there a better way to do this since sink adds resources?
      (ctx: Context.Context<R1 | R3 | Scope.Scope>) => Context.merge(ctx, this.f(ctx))
    )
  }
}
