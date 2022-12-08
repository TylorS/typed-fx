import { Effect, identity, pipe } from 'effect'

import { Emitter, Fx } from './Fx.js'
import { exitEarly, onEarlyExitFailure } from './_internal.js'

export function zipIterable<A, B, C>(iterable: Iterable<A>, f: (a: A, b: B) => C) {
  return <R, E>(fx: Fx<R, E, B>): Fx<R, E, C> => zipIterable_(fx, iterable, f)
}

export function withIterable<A>(iterable: Iterable<A>) {
  return <R, E, B>(fx: Fx<R, E, B>): Fx<R, E, A> => zipIterable_(fx, iterable, identity)
}

function zipIterable_<R, E, A, B, C>(
  fx: Fx<R, E, B>,
  iterable: Iterable<A>,
  f: (a: A, b: B) => C,
): Fx<R, E, C> {
  return Fx((emitter) =>
    pipe(
      Effect.suspendSucceed(() => {
        const iterator = iterable[Symbol.iterator]()
        let result = iterator.next()

        if (result.done) {
          return emitter.end
        }

        return fx.run(
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
