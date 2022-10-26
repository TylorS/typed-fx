import * as Effect from '@effect/core/io/Effect'
import { pipe } from 'node_modules/@fp-ts/data/Function.js'

import { Emitter, Push } from './Push.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

// TODO: Natively support iterator until done:true

export function zipIterable<A, B, C>(iterable: Iterable<A>, f: (a: A, b: B) => C) {
  return <R, E>(push: Push<R, E, B>): Push<R, E, C> => zipIterable_(push, iterable, f)
}

export function withIterable<A>(iterable: Iterable<A>) {
  return <R, E, B>(push: Push<R, E, B>): Push<R, E, readonly [A, B]> =>
    zipIterable_(push, iterable, (a, b) => [a, b])
}

export function zipIterable_<R, E, A, B, C>(
  push: Push<R, E, B>,
  iterable: Iterable<A>,
  f: (a: A, b: B) => C,
): Push<R, E, C> {
  return Push((emitter) =>
    pipe(
      Effect.suspendSucceed(() => {
        const array = Array.from(iterable)
        let i = 0

        return push.run(
          Emitter(
            (b) => {
              const a = array[i++]
              const c = f(a, b)

              return pipe(
                emitter.emit(c),
                Effect.flatMap((x) => (i === array.length ? exitEarly : Effect.succeed(x))),
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
