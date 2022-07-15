import { LocalScope } from './LocalScope'
import { Closeable } from './Scope'

import { fromLazy, success, unit } from '@/Fx/index'

export class GlobalScope extends Closeable {
  constructor() {
    super(
      () => success(() => unit),
      (s) => fromLazy(() => new LocalScope(s)),
      () => success(false),
    )
  }
}

/**
 * Given that GlobalScope is entirely stateless, we really only need one instance.
 */
export const globalScope = new GlobalScope()
