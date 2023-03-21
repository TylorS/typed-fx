import { Sink } from "@typed/fx/Fx"
import type { Fx } from "@typed/fx/Fx"
import { Cause, Either, pipe } from "@typed/fx/internal/_externals"
import { BaseFx } from "@typed/fx/internal/Fx"

export function right<R, E, A, B>(
  self: Fx<R, E, Either.Either<A, B>>
): Fx<R, Either.Either<A, E>, B> {
  return new RightFx(self)
}

export class RightFx<R, E, A, B> extends BaseFx<R, Either.Either<A, E>, B> {
  readonly name = "Right"

  constructor(readonly self: Fx<R, E, Either.Either<A, B>>) {
    super()
  }

  run(sink: Sink<Either.Either<A, E>, B>) {
    return this.self.run(
      Sink(
        (e) =>
          pipe(
            e,
            Either.match(
              (a) => sink.error(Cause.fail(Either.left(a))),
              (b) => sink.event(b)
            )
          ),
        (cause) => sink.error(Cause.map(cause, Either.right)),
        () => sink.end()
      )
    )
  }
}
