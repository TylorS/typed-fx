import { DeepEquals } from 'hkt-ts/Typeclass/Eq'
import { pipe } from 'hkt-ts/function'

import { Fx } from './Fx.js'
import { fromCause, lazy, now } from './constructors.js'
import { flatMap, orElse } from './control-flow.js'

import { getCauseError } from '@/Cause/CauseError.js'
import * as Cause from '@/Cause/index.js'

export function gen<R, E, A>(f: () => Generator<Fx<R, E, any>, A, any>): Fx<R, E, A> {
  return lazy(() => {
    const gen = f()

    return pipe(
      runFxGenerator(gen, gen.next()),
      // Allow running Gen.throw to attempt to use try/catch to handle any errors
      orElse((cause) => {
        const error = getCauseError(cause)

        return Cause.shouldRethrow(cause)
          ? pipe(
              lazy(() => runFxGenerator(gen, gen.throw(error))),
              orElse((inner) =>
                // Ensure the the most useful error is continued up the stack
                DeepEquals.equals(getCauseError(inner), error)
                  ? fromCause(cause)
                  : fromCause(Cause.sequential(cause, inner)),
              ),
            )
          : fromCause(cause)
      }),
    )
  })
}

function runFxGenerator<Y extends Fx<any, any, any>, R>(
  gen: Generator<Y, R>,
  result: IteratorResult<Y, R>,
): Fx<Fx.ResourcesOf<Y>, Fx.ErrorsOf<Y>, R> {
  if (result.done) {
    return now(result.value)
  }

  return pipe(
    result.value,
    flatMap((a) => runFxGenerator(gen, gen.next(a))),
  )
}
