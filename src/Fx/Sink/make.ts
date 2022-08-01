import { isLeft } from 'hkt-ts/Either'
import { pipe } from 'hkt-ts/function'

import { Cause } from '../Cause/Cause.js'
import { Fx, attempt, getEnv } from '../Fx/Fx.js'
import { getFiberScope } from '../Fx/Instruction/GetFiberScope.js'
import { provide } from '../Fx/Instruction/Provide.js'

import { Sink } from './Sink.js'

export function make<R, E, A>(
  event: (a: A) => Fx<R, E, any>,
  error: (cause: Cause<E>) => Fx<R, E, any>,
  end: Fx<R, E, any>,
): Fx<R, E, Sink<E, A>> {
  return Fx(function* () {
    const env = yield* getEnv<R>()
    const scope = yield* getFiberScope()

    const sink: Sink<E, A> = {
      event: (a) =>
        Fx(function* () {
          const exit = yield* pipe(a, event, provide(env), attempt)

          if (isLeft(exit)) {
            yield* sink.error(exit.left)
          }
        }),
      error: (cause) =>
        Fx(function* () {
          const exit = yield* pipe(cause, error, provide(env), attempt)

          if (isLeft(exit)) {
            yield* scope.close(exit)
          }
        }),
      end: pipe(end, provide(env)),
    }

    return sink
  })
}
