import * as Effect from '@effect/core/io/Effect'
import { identity, pipe } from '@fp-ts/data/Function'

import { Emitter, Push } from './Push.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function zipIterable<A, B, C>(iterable: Iterable<A>, f: (a: A, b: B) => C) {
  return <R, E>(push: Push<R, E, B>): Push<R, E, C> => zipIterable_(push, iterable, f)
}

export function withIterable<A>(iterable: Iterable<A>) {
  return <R, E, B>(push: Push<R, E, B>): Push<R, E, A> => zipIterable_(push, iterable, identity)
}

export function zipIterable_<R, E, A, B, C>(
  push: Push<R, E, B>,
  iterable: Iterable<A>,
  f: (a: A, b: B) => C,
): Push<R, E, C> {
  return Push((emitter) =>
    pipe(
      Effect.suspendSucceed(() => {
        const iterator = iterable[Symbol.iterator]()
        let result = iterator.next()

        if (result.done) {
          return emitter.end
        }

        return push.run(
          Emitter(
            (b) => {
              const a = result.value
              const c = f(a, b)

              result = iterator.next()

              return pipe(
                emitter.emit(c),
                Effect.flatMap((x) => (result.done ? exitEarly : Effect.succeed(x))),
              )
            },
            emitter.failCause,
            emitter.end,
          ),
        )
      }),
      onEarlyExitFailure(emitter.end),
    ),
  )
}
