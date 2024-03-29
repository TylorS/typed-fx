import { Cause, Either, Option, pipe } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import type { Fx } from "@typed/fx/internal/Fx"
import { Sink } from "@typed/fx/internal/Fx"

export function unsome<R, E, A>(
  fx: Fx<R, Option.Option<E>, A>
): Fx<R, E, Option.Option<A>> {
  return new UnsomeFx(fx)
}

export class UnsomeFx<R, E, A> extends BaseFx<R, E, Option.Option<A>> {
  readonly name = "Unsome"

  constructor(readonly self: Fx<R, Option.Option<E>, A>) {
    super()
  }

  run(sink: Sink<E, Option.Option<A>>) {
    return this.self.run(
      Sink(
        (a) => sink.event(Option.some(a)),
        (cause) =>
          pipe(
            cause,
            Cause.failureOrCause,
            Either.match(
              Option.match(
                () => sink.event(Option.none()),
                (e) => sink.error(Cause.fail(e))
              ),
              sink.error
            )
          ),
        sink.end
      )
    )
  }
}
