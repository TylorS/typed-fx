import { constant } from 'hkt-ts'

import { Closeable } from './Closeable.js'
import { LocalScope } from './LocalScope.js'
import { Open } from './ScopeState.js'

import { success, unit } from '@/Fx/Fx.js'

export const GlobalScope: Closeable = {
  state: Open,
  ensuring: constant(constant(unit)),
  fork: () => new LocalScope(),
  close: constant(success(false)) as Closeable['close'],
}
