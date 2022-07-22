import { Maybe } from 'hkt-ts/Maybe'

import { FinalizationStrategy, Finalizer, SequentialStrategy } from './Finalizer'

import type { Exit } from '@/Exit/Exit'
import { Of } from '@/Fx/Fx'
import { Service } from '@/Service/Service'

export class Scope extends Service {
  constructor(
    readonly addFinalizer: (finalizer: Finalizer) => Maybe<Finalizer>,
    readonly forkWith: (strategy: FinalizationStrategy) => Closeable,
  ) {
    super()
  }

  readonly ensuring = (fx: Of<any>) => this.addFinalizer(() => fx)

  get fork() {
    return this.forkWith(SequentialStrategy)
  }
}

export class Closeable extends Scope {
  constructor(
    readonly addFinalizer: (finalizer: Finalizer) => Maybe<Finalizer>,
    readonly forkWith: (strategy: FinalizationStrategy) => Closeable,
    readonly close: (exit: Exit<any, any>) => Of<boolean>,
  ) {
    super(addFinalizer, forkWith)
  }
}
