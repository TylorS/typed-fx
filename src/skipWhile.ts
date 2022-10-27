import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { pipe } from '@fp-ts/data/Function'
import { Predicate, not } from '@tsplus/stdlib/data/Predicate'

import { Emitter, Fx } from './Fx.js'
import { onEarlyExitFailure } from './_internal.js'

export function skipWhile<A>(predicate: Predicate<A>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R, E, A> => skipWhile_(fx, predicate)
}

export function skipUntil<A>(predicate: Predicate<A>) {
  return skipWhile(not(predicate))
}

function skipWhile_<R, E, A>(fx: Fx<R, E, A>, predicate: Predicate<A>): Fx<R, E, A> {
  return Fx((emitter) =>
    pipe(
      Ref.makeRef<boolean>(() => false),
      Effect.flatMap((ref) =>
        pipe(
          fx.run(
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
