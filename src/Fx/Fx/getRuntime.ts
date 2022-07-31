import { Runtime, make } from '../Runtime/Runtime.js'

import { Fx, getEnv } from './Fx.js'
import { getFiberContext } from './Instruction/GetFiberContext.js'
import { getFiberScope } from './Instruction/GetFiberScope.js'

export function getRuntime<R>(): Fx<R, never, Runtime<R>> {
  return Fx(function* () {
    return make(yield* getEnv<R>(), yield* getFiberContext(), yield* getFiberScope())
  })
}
