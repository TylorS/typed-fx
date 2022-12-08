import { Effect, Predicate, Ref, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { onEarlyExitFailure } from './_internal.js'

export function skipWhile<A>(predicate: Predicate.Predicate<A>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R, E, A> => skipWhile_(fx, predicate)
}

export function skipUntil<A>(predicate: Predicate.Predicate<A>) {
  return skipWhile(Predicate.not(predicate))
}

function skipWhile_<R, E, A>(fx: Fx<R, E, A>, predicate: Predicate.Predicate<A>): Fx<R, E, A> {
  return Fx((emitter) =>
    pipe(
      Ref.make<boolean>(false),
      Effect.flatMap((ref) =>
        pipe(
          fx.run(
            Emitter(
              (a) =>
                pipe(
                  ref,
                  Ref.get,
                  Effect.flatMap((started) =>
                    started
                      ? emitter.emit(a)
                      : predicate(a)
                      ? Effect.unit()
                      : pipe(ref, Ref.set(true), Effect.zipRight(emitter.emit(a))),
                  ),
                ),
              emitter.failCause,
              emitter.end,
            ),
          ),
        ),
      ),
      onEarlyExitFailure(emitter.end),
    ),
  )
}
