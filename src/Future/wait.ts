import type { Future } from './Future.js'

import type { Fx } from '@/Fx/Fx.js'
import { Wait } from '@/Fx/Instructions/Wait.js'

export function wait<R, E, A>(future: Future<R, E, A>): Fx<R, E, A> {
  return new Wait(future)
}
