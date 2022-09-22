import { Maybe, constant, identity, pipe } from 'hkt-ts'
import { Nothing } from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberRef, make } from './FiberRef.js'

import type { Env } from '@/Env/Env.js'
import { Live } from '@/Fiber/Fiber.js'
import * as FiberRefs from '@/FiberRefs/FiberRefs.js'
import * as Fx from '@/Fx/Fx.js'
import { join } from '@/Fx/join.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { LogAnnotation } from '@/Logger/LogAnnotation.js'
import { LogSpan } from '@/Logger/LogSpan.js'
import { Semaphore } from '@/Semaphore/Semaphore.js'
import { Service } from '@/Service/Service.js'
import { Trace } from '@/Trace/Trace.js'

export const CurrentEnv = make(
  pipe(
    Fx.getFiberContext,
    Fx.map((c) => makeEnvFromFiberRefs(c.fiberRefs)),
  ),
  {
    fork: constant(Nothing), // Always create a new Env for each Fiber.
    join: identity, // Always keep the parent Fiber's Env
  },
)

export function makeEnvFromFiberRefs<R>(fiberRefs: FiberRefs.FiberRefs): Env<R> {
  // Always use a snapshot of the FiberRefs to avoid mutability problems.
  const forked = FiberRefs.fork(fiberRefs)

  return {
    fiberRefs: forked,
    get: getServiceFromFiberRefs(forked),
    addService: addServiceFromFiberRefs(forked),
    join: joinEnvFromFiberRefs(forked),
  }
}

export const CurrentConcurrencyLevel = make(
  Fx.fromLazy(() => new Semaphore(NonNegativeInteger(Infinity))),
  {
    join: identity, // Always keep the parent Fiber's concurrency level
  },
)

export const CurrentInterruptStatus = make(Fx.now(true), {
  join: identity, // Always keep the parent Fiber's interrupt status
})

export const CurrentTrace = make(
  Fx.fromLazy<Trace>(() => Trace.runtime(new Error())),
  {
    join: identity, // Always keep the parent Fiber's trace
  },
)

export const Layers = FiberRef.make(
  Fx.fromLazy(() =>
    ImmutableMap<Service<any>, readonly [() => Live<never, any>, Maybe.Maybe<Live<never, any>>]>(),
  ),
  {
    join: identity, // Always keep the parent Fiber's layers
  },
)

export const Services = FiberRef.make(
  Fx.fromLazy(() => ImmutableMap<Service<any>, any>()),
  {
    join: identity, // Always keep the parent Fiber's services
  },
)

export const CurrentLogSpans = FiberRef.make(
  Fx.fromLazy(() => ImmutableMap<string, LogSpan>()),
  {
    join: identity,
  },
)

export const CurrentLogAnnotations = FiberRef.make(
  Fx.fromLazy(() => ImmutableMap<string, LogAnnotation>()),
  {
    join: identity,
  },
)

export function getServiceFromFiberRefs(fiberRefs: FiberRefs.FiberRefs) {
  return <S>(id: Service<S>): Fx.Of<S> => {
    return Fx.lazy(() => {
      const service = pipe(
        fiberRefs,
        FiberRefs.maybeGetFiberRefValue(Services),
        Maybe.flatMap((s) => s.get(id)),
      )

      if (Maybe.isJust(service)) {
        return Fx.success(service.value as S)
      }

      return getLayerFromFiberRefs(id, fiberRefs)
    })
  }
}

const getLayerFromFiberRefs = <S>(id: Service<S>, fiberRefs: FiberRefs.FiberRefs) =>
  Fx.lazy(() => {
    const layers = FiberRefs.maybeGetFiberRefValue(Layers)(fiberRefs)

    // Add Layers if it is missing
    if (Maybe.isNothing(layers)) {
      throw new Error(`Unable to find Layer or Service for ${id.description}`)
    }

    const layer = layers.value.get(id)

    if (Maybe.isNothing(layer)) {
      throw new Error(`Unable to find Layer or Service for ${id.description}`)
    }

    const [makeFiber, currentFiber] = layer.value

    if (Maybe.isJust(currentFiber)) {
      return pipe(currentFiber.value.exit, Fx.flatMap(Fx.fromExit))
    }

    const fiber = makeFiber()

    FiberRefs.setFiberRef(Layers, layers.value.set(id, [makeFiber, Maybe.Just(fiber)]))(fiberRefs)

    return join(fiber)
  })

export function addServiceFromFiberRefs<R>(fiberRefs: FiberRefs.FiberRefs): Env<R>['addService'] {
  return (id, impl) => {
    const forked = fiberRefs.fork()

    // AddService
    FiberRefs.setFiberRef(
      Services,
      pipe(
        forked,
        FiberRefs.maybeGetFiberRefValue(Services),
        Maybe.match(
          () => ImmutableMap<Service<any>, any>().set(id, impl),
          (s) => s.set(id, impl),
        ),
      ),
    )(forked)

    return makeEnvFromFiberRefs(forked)
  }
}

export function joinEnvFromFiberRefs<R>(fiberRefs: FiberRefs.FiberRefs): Env<R>['join'] {
  return (other) => {
    const forked = other.fiberRefs.fork()

    // Reverse the order to ensure incoming values take precedence for Services + Layers
    FiberRefs.join(forked, fiberRefs)

    return makeEnvFromFiberRefs(forked)
  }
}
