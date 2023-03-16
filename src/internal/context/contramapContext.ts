import { dualWithTrace } from "@effect/io/Debug"
import type { Fx, Sink } from "@typed/fx/Fx"
import { Context, Effect, Option, Scope } from "@typed/fx/internal/_externals"
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

  run(sink: Sink<E, A>) {
    const { f, fx } = this

    return Effect.scopeWith((scope) =>
      Effect.contramapContext(
        fx.run(sink),
        (r1: Context.Context<R1>) => {
          const r2 = f(r1)

          if (Option.isSome(Context.getOption(r2, Scope.Tag))) {
            return r2 as Context.Context<R2 | Scope.Scope>
          }

          return Context.add(Scope.Tag, scope)(r2)
        }
      )
    )
  }
}
