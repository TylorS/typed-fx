import { Predicate, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function takeWhile<A>(predicate: Predicate.Predicate<A>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R, E, A> => takeWhile_(fx, predicate)
}

export function takeUntil<A>(predicate: Predicate.Predicate<A>) {
  return takeWhile(Predicate.not(predicate))
}

function takeWhile_<R, E, A>(fx: Fx<R, E, A>, predicate: Predicate.Predicate<A>): Fx<R, E, A> {
  return Fx((emitter) =>
    pipe(
      fx.run(
        Emitter(
          (a) => (predicate(a) ? emitter.emit(a) : exitEarly),
          emitter.failCause,
          emitter.end,
        ),
      ),
      onEarlyExitFailure(emitter.end),
    ),
  )
}
