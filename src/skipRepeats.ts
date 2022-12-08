import { Effect, Equal, Option, Ref, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'

export function skipRepeats<R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> {
  return Fx((sink) =>
    pipe(
      Ref.make<Option.Option<A>>(Option.none),
      Effect.flatMap((ref) =>
        fx.run(
          Emitter(
            (a) =>
              Effect.flatten(
                pipe(
                  ref,
                  Ref.modify((m) => {
                    const m2 = Option.some(a)
                    return [Equal.equals(m, m2) ? Effect.unit() : sink.emit(a), m2]
                  }),
                ),
              ),
            sink.failCause,
            sink.end,
          ),
        ),
      ),
    ),
  )
}
