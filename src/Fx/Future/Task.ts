import { pending } from './Future.js'
import { complete } from './complete.js'
import { wait } from './wait.js'

import type { Fx } from '@/Fx/Fx/Fx.js'

/**
 * The Task is a small wrapper around a Future that already has the Fx to
 * continue with, but it should not continue until later.
 */
export interface Task<R, E, A> {
  readonly wait: Fx<R, E, A>
  readonly complete: () => boolean
}

export function Task<R, E, A>(fx: Fx<R, E, A>): Task<R, E, A> {
  const future = pending<A, R, E>()

  return {
    wait: wait(future),
    complete: () => complete(future)(fx),
  }
}
