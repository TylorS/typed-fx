import { dualWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Context, Effect } from "@typed/fx/internal/_externals"

export const provideContext: {
  <R, E, A>(fx: Fx<R, E, A>, context: Context.Context<R>): Fx<never, E, A>
  <R>(context: Context.Context<R>): <E, A>(fx: Fx<R, E, A>) => Fx<never, E, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(fx: Fx<R, E, A>, context: Context.Context<R>): Fx<never, E, A> =>
      fx.transform(Effect.contramapContext(Context.merge(context))).transform((e) => e.traced(trace))
)
