import { dualWithTrace } from "@effect/io/Debug"
import type { Fx } from "@typed/fx/Fx"
import { Sink } from "@typed/fx/Fx"
import { Cause } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export const orDieWith: {
  <R, E, A>(self: Fx<R, E, A>, f: (error: E) => unknown): Fx<R, never, A>
  <E>(f: (error: E) => unknown): <R, A>(self: Fx<R, E, A>) => Fx<R, never, A>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A>(self: Fx<R, E, A>, f: (error: E) => unknown): Fx<R, never, A> =>
      new OrDieWithFx(self, f).transform((e) => e.traced(trace))
)

class OrDieWithFx<R, E, A> extends BaseFx<R, never, A> {
  readonly name = "OrDieWithFx" as const

  constructor(readonly self: Fx<R, E, A>, readonly f: (error: E) => unknown) {
    super()
  }

  run(sink: Sink<never, A>) {
    return this.self.run(
      Sink(
        sink.event,
        (cause) => sink.error(Cause.flatMap(cause, (e) => Cause.die(this.f(e)))),
        sink.end
      )
    )
  }
}
