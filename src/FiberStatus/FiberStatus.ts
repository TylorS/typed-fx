import { Exit } from '@/Exit/Exit'
import { FiberId } from '@/FiberId/FiberId'

export type FiberStatus<E, A> = Suspended | Running | Exited<E, A>

export class Suspended {
  readonly tag = 'Suspended'
  constructor(readonly fiberId: FiberId) {}
}

export class Running {
  readonly tag = 'Running'

  constructor(readonly fiberId: FiberId) {}
}

export class Exited<out E, out A> {
  readonly tag = 'Exited'

  constructor(readonly fiberId: FiberId, readonly exit: Exit<E, A>) {}
}
