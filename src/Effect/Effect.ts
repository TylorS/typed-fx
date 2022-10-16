import { pipe } from 'hkt-ts'
import { DeepEquals } from 'hkt-ts/Typeclass/Eq'

import type { Op } from './Op.js'
import * as ops from './ops.js'

import { getCauseError } from '@/Cause/CauseError.js'
import { sequential, shouldRethrow } from '@/Cause/index.js'

export interface Effect<R, E, A> {
  readonly __Effect__: {
    readonly _R: () => R
    readonly _E: () => E
    readonly _A: () => A
  }

  readonly op: Op
  readonly [Symbol.iterator]: () => Generator<Effect<R, E, any>, A, any>
}

export namespace Effect {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  export type ResourcesOf<T> = [T] extends [never]
    ? never
    : [T] extends [Effect<infer _R, infer _E, infer _A>]
    ? _R
    : never
  export type ErrorsOf<T> = [T] extends [never]
    ? never
    : [T] extends [Effect<infer _R, infer _E, infer _A>]
    ? _E
    : never
  export type OutputOf<T> = [T] extends [never]
    ? never
    : [T] extends [Effect<infer _R, infer _E, infer _A>]
    ? _A
    : never
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export function Effect<Y, A>(
  f: () => Generator<Y, A, any>,
): Effect<Effect.ResourcesOf<Y>, Effect.ErrorsOf<Y>, A> {
  return ops.lazy(() => {
    const gen = f()

    return pipe(
      runGenerator(gen, gen.next()),
      // Allow running Gen.throw to attempt to use try/catch to handle any errors
      ops.orElseCause((cause) => {
        const error = getCauseError(cause)

        return shouldRethrow(cause)
          ? pipe(
              ops.lazy(() => runGenerator(gen, gen.throw(error))),
              ops.orElseCause((inner) =>
                // Ensure the the most useful error is continued up the stack
                DeepEquals.equals(getCauseError(inner), error)
                  ? ops.fromCause(cause)
                  : ops.fromCause(sequential(cause, inner)),
              ),
            )
          : ops.fromCause(cause)
      }),
    )
  })
}

function runGenerator<Y, R>(
  gen: Generator<Y, R>,
  result: IteratorResult<Y, R>,
): Effect<Effect.ResourcesOf<Y>, Effect.ErrorsOf<Y>, R> {
  if (result.done) {
    return ops.now(result.value) as Effect<Effect.ResourcesOf<Y>, Effect.ErrorsOf<Y>, R>
  }

  return pipe(
    result.value as any as Effect<Effect.ResourcesOf<Y>, Effect.ErrorsOf<Y>, any>,
    ops.flatMap((a) => runGenerator(gen, gen.next(a) as typeof result)),
  )
}
