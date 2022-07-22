import { Nothing } from 'hkt-ts/Maybe'

import { LocalScope } from './LocalScope'
import { Closeable } from './Scope'

import { success } from '@/Fx/index'

export class GlobalScope extends Closeable {
  constructor() {
    super(
      () => Nothing,
      (s) => new LocalScope(s),
      () => success(false),
    )
  }
}

/**
 * Given that GlobalScope is entirely stateless, we really only need one instance.
 */
export const globalScope = new GlobalScope()
