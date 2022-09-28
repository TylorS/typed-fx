import { Fx } from './Fx.js'

import { Exit } from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/FiberId.js'

export interface Fiber<E, A> {
  readonly id: FiberId
  readonly exit: Fx.Of<Exit<E, A>>
  readonly join: Fx.IO<E, A>
  readonly interruptAs: (id: FiberId) => Fx.Of<boolean>
}
