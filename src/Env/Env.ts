import { getFromFiberRefs } from '@/FiberRef/builtins.js'
import * as FiberRefs from '@/FiberRefs/FiberRefs.js'
import { Of } from '@/Fx/Fx.js'
import { Service } from '@/Service/Service.js'

export interface Env<R> {
  readonly get: <S extends R>(service: Service<S>) => Of<S>
}

export function Env<R>(fiberRefs: FiberRefs.FiberRefs): Env<R> {
  return {
    get: getFromFiberRefs(fiberRefs.fork()), // Always use a snapshot of the FiberRefs to avoid mutability problems.
  }
}
