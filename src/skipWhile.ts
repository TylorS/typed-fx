import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import { Predicate, not } from '@tsplus/stdlib/data/Predicate'

import { Emitter, Push } from './Push.js'
import { onEarlyExitFailure } from './_internal.js'

export function skipWhile<A>(predicate: Predicate<A>) {
  return <R, E>(push: Push<R, E, A>): Push<R, E, A> => skipWhile_(push, predicate)
}

export function skipUntil<A>(predicate: Predicate<A>) {
  return skipWhile(not(predicate))
}

function skipWhile_<R, E, A>(push: Push<R, E, A>, predicate: Predicate<A>): Push<R, E, A> {
  return Push((emitter) =>
    pipe(
      Ref.makeRef<boolean>(() => false),
      Effect.flatMap((ref) =>
        pipe(
          push.run(
            Emitter(
              (a) =>
                pipe(
                  ref.get,
                  Effect.flatMap((started) =>
                    started
                      ? emitter.emit(a)
                      : predicate(a)
                      ? Effect.unit
                      : pipe(ref.set(true), Effect.zipRight(emitter.emit(a))),
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
