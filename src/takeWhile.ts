import { pipe } from '@fp-ts/data/Function'
import { Predicate, not } from '@tsplus/stdlib/data/Predicate'

import { Emitter, Fx } from './Fx.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function takeWhile<A>(predicate: Predicate<A>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R, E, A> => takeWhile_(fx, predicate)
}

export function takeUntil<A>(predicate: Predicate<A>) {
  return takeWhile(not(predicate))
}

function takeWhile_<R, E, A>(fx: Fx<R, E, A>, predicate: Predicate<A>): Fx<R, E, A> {
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
