import { makeEnvFromFiberRefs } from '@/FiberRef/builtins.js'
import * as FiberRefs from '@/FiberRefs/FiberRefs.js'
import { Of } from '@/Fx/Fx.js'
import { Service } from '@/Service/Service.js'

/**
 * Env is an abstraction over FiberRefs which keeps track of services and joining them back together.
 */
export interface Env<R> {
  readonly fiberRefs: FiberRefs.FiberRefs
  readonly get: <S extends R>(service: Service<S>) => Of<S>
  readonly addService: <S, I extends S>(service: Service<S>, impl: I) => Env<R | S>
  readonly join: <S>(other: Env<S>) => Env<R | S>
}

export const Empty = makeEnvFromFiberRefs<never>(FiberRefs.FiberRefs())

export function Env<S, I extends S>(service: Service<S>, impl: I): Env<S> {
  return Empty.addService(service, impl)
}

export function fromFiberRefs<R>(fiberRefs: FiberRefs.FiberRefs): Env<R> {
  return makeEnvFromFiberRefs(fiberRefs)
}
