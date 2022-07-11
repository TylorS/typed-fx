import { LocalScope } from './LocalScope'
import { Closeable, FinalizationStrategy, Finalizer } from './Scope'

import { Exit } from '@/Exit/Exit'
import { Of } from '@/Fx/Fx'
import { fromLazy, success } from '@/Fx/index'

const unit = success<void>(undefined)

export class GlobalScope extends Closeable {
  readonly addFinalizer: (finalizer: Finalizer) => Of<Finalizer> = () => success(() => unit)
  readonly forkWith: (strategy: FinalizationStrategy) => Of<Closeable> = (s) =>
    fromLazy(() => new LocalScope(s))
  readonly close: (exit: Exit<any, any>) => Of<void> = () => unit
}

/**
 * Given that GlobalScope is entirely stateless, we really only need one instance.
 */
export const globalScope = new GlobalScope()
