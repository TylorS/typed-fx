import { Left } from 'hkt-ts/Either'

import { Effect } from './Effect.js'
import { async, fromCause, now } from './ops.js'

import { unexpected } from '@/Cause/Cause.js'
import { settable } from '@/Disposable/Disposable.js'

export function fromPromise<A>(f: () => Promise<A>): Effect<never, never, A> {
  return async((cb) => {
    const inner = settable()

    f().then(
      (a) => !inner.isDisposed() && cb(now(a)),
      (e) => !inner.isDisposed() && cb(fromCause(unexpected(e))),
    )

    return Left(inner)
  })
}
