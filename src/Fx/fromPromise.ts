import { Left } from 'hkt-ts/Either'

import { async, die, fromExit, fromLazy, interrupt, success } from './Fx.js'

import { Sequential, died, interrupted } from '@/Cause/Cause.js'
import { settable } from '@/Disposable/Disposable.js'

export function fromPromise<A>(f: () => Promise<A>) {
  return async((cb, fiberId) => {
    const d = settable()

    f()
      .then((a) => {
        if (d.isDisposed()) {
          return cb(interrupt(fiberId))
        }

        cb(success(a))
      })
      .catch((e) => {
        if (d.isDisposed()) {
          return cb(fromExit(Left(new Sequential(interrupted(fiberId), died(e)))))
        }

        cb(die(e))
      })

    return Left(fromLazy(() => d.dispose()))
  })
}
