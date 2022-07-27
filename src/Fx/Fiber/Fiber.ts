import { Exit } from '../Exit/Exit.js'
import { FiberId } from '../FiberId/FiberId.js'
import { Of } from '../Fx/Fx.js'

export type Fiber<E, A> = LiveFiber<E, A> | SyntheticFiber<E, A>

export namespace Fiber {
  export type Live<E, A> = LiveFiber<E, A>

  export const Live = <E, A>(
    id: FiberId.Live,
    exit: Of<Exit<E, A>>,
    inheritRefs: Of<void>,
  ): Live<E, A> => ({ tag: 'Live', id, exit, inheritRefs })

  export type Synthetic<E, A> = SyntheticFiber<E, A>

  export const Synthetic = <E, A>(
    id: FiberId.Synthetic,
    exit: Of<Exit<E, A>>,
    inheritRefs: Of<void>,
  ): Synthetic<E, A> => ({ tag: 'Synthetic', id, exit, inheritRefs })
}

export interface LiveFiber<E, A> {
  readonly tag: 'Live'
  readonly id: FiberId.Live
  readonly exit: Of<Exit<E, A>>
  readonly inheritRefs: Of<void>
}

export interface SyntheticFiber<E, A> {
  readonly tag: 'Synthetic'
  readonly id: FiberId.Synthetic
  readonly exit: Of<Exit<E, A>>
  readonly inheritRefs: Of<void>
}
