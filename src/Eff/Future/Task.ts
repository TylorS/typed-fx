import { Eff } from '../Eff.js'
import { Async } from '../Instructions/Async.js'

import { pending } from './Future.js'
import { complete } from './complete.js'
import { wait } from './wait.js'

/**
 * The Task is a small wrapper around a Future that already has the Fx to
 * continue with, but it should not continue until later.
 */
export interface Task<Y, R> {
  readonly wait: Eff<Y | Async<Y, R, never>, R>
  readonly complete: () => boolean
}

export function Task<Y, R>(fx: Eff<Y, R>): Task<Y, R> {
  const future = pending<Y, R>()

  return {
    wait: wait(future),
    complete: () => complete(future)(fx),
  }
}
