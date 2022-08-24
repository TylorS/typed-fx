import type { Future } from './Future.js'

import type { Fx } from '@/Fx/Fx.js'
import { Wait } from '@/Fx/Instruction.js'

export function wait<R, E, A>(future: Future<R, E, A>): Fx<R, E, A> {
  return Wait.make(future)
}
