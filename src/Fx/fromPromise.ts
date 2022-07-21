import { Left } from 'hkt-ts/Either'

import { IO } from './Fx'
import { async } from './InstructionSet/Async'
import { die, success } from './InstructionSet/FromExit'
import { fromLazy } from './lazy'

export function fromPromise<A, E = never>(
  f: (signal: AbortSignal) => Promise<A>,
  onError: (e: unknown) => IO<E, A> = die,
): IO<E, A> {
  return async((cb) => {
    const controller = new AbortController()
    const promise = f(controller.signal)

    promise.then(
      (a) => cb(success(a)),
      (e) => cb(onError(e)),
    )

    return Left(fromLazy(() => controller.abort()))
  })
}
