import { Left } from 'hkt-ts/Either'

import * as Fx from './Fx.js'

import * as Cause from '@/Cause/Cause.js'
import { settable } from '@/Disposable/Disposable.js'

export function fromPromise<A>(f: () => Promise<A>) {
  return Fx.async((cb, fiberId) => {
    const d = settable()

    f()
      .then((a) => {
        if (d.isDisposed()) {
          return cb(Fx.interrupt(fiberId))
        }

        cb(Fx.success(a))
      })
      .catch((e) => {
        if (d.isDisposed()) {
          return cb(
            Fx.fromExit(
              Left(new Cause.Sequential(Cause.interrupted(fiberId), Cause.unexpected(e))),
            ),
          )
        }

        cb(Fx.unexpected(e))
      })

    return Left(Fx.fromLazy(() => d.dispose()))
  })
}
