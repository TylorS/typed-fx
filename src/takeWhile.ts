import { pipe } from '@fp-ts/data/Function'
import { Predicate, not } from '@tsplus/stdlib/data/Predicate'

import { Emitter, Push } from './Push.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function takeWhile<A>(predicate: Predicate<A>) {
  return <R, E>(push: Push<R, E, A>): Push<R, E, A> => takeWhile_(push, predicate)
}

export function takeUntil<A>(predicate: Predicate<A>) {
  return takeWhile(not(predicate))
}

function takeWhile_<R, E, A>(push: Push<R, E, A>, predicate: Predicate<A>): Push<R, E, A> {
  return Push((emitter) =>
    pipe(
      push.run(
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
