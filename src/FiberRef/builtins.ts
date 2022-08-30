import { Maybe, constant, identity, pipe } from 'hkt-ts'
import { isRight } from 'hkt-ts/Either'
import { Nothing } from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberRef, make } from './FiberRef.js'

import type { Env } from '@/Env/Env.js'
import type { Live } from '@/Fiber/Fiber.js'
import * as FiberRefs from '@/FiberRefs/FiberRefs.js'
import { Fx, Of, getFiberContext, map, now } from '@/Fx/Fx.js'
import { FromCause } from '@/Fx/Instruction.js'
import { join } from '@/Fx/join.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { LogAnnotation } from '@/Logger/LogAnnotation.js'
import { LogSpan } from '@/Logger/LogSpan.js'
import { Semaphore } from '@/Semaphore/Semaphore.js'
import { Service } from '@/Service/Service.js'
import { EmptyTrace, Trace } from '@/Trace/Trace.js'

export const CurrentEnv = make(
  pipe(
    getFiberContext,
    map((c): Env<any> => ({ get: getFromFiberRefs(c.fiberRefs) })),
  ),
  {
    fork: constant(Nothing), // Always create a new Env for each Fiber.
    join: identity, // Always keep the parent Fiber's Env
  },
)

export const CurrentConcurrencyLevel = make(now(new Semaphore(NonNegativeInteger(Infinity))), {
  join: identity, // Always keep the parent Fiber's concurrency level
})

export const CurrentInterruptStatus = make(now(true), {
  join: identity, // Always keep the parent Fiber's interrupt status
})

export const CurrentTrace = make(now<Trace>(EmptyTrace), {
  join: identity, // Always keep the parent Fiber's trace
})

export const Layers = FiberRef.make(
  now(
    ImmutableMap<Service<any>, readonly [() => Live<never, any>, Maybe.Maybe<Live<never, any>>]>(),
  ),
  {
    join: identity, // Always keep the parent Fiber's layers
  },
)

export const Services = FiberRef.make(now(ImmutableMap<Service<any>, any>()), {
  join: identity, // Always keep the parent Fiber's services
})

export const CurrentLogSpans = FiberRef.make(now(ImmutableMap<string, LogSpan>()), {
  join: identity,
})

export const CurrentLogAnnotations = FiberRef.make(now(ImmutableMap<string, LogAnnotation>()), {
  join: identity,
})

export function getFromFiberRefs(fiberRefs: FiberRefs.FiberRefs) {
  return <S>(id: Service<S>): Of<S> => {
    return Fx(function* () {
      const service = pipe(
        fiberRefs,
        FiberRefs.maybeGetFiberRefValue(Services),
        Maybe.flatMap((s) => s.get(id)),
      )

      if (Maybe.isJust(service)) {
        return service.value as S
      }

      return yield* getLayer(id, fiberRefs)
    })
  }
}

const getLayer = <S>(id: Service<S>, fiberRefs: FiberRefs.FiberRefs) =>
  Fx(function* () {
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
      const exit = yield* currentFiber.value.exit

      if (isRight(exit)) {
        return exit.right
      }

      return yield* FromCause.make(exit.left)
    }

    const fiber = makeFiber()

    FiberRefs.setFiberRef(Layers, layers.value.set(id, [makeFiber, Maybe.Just(fiber)]))(fiberRefs)

    return (yield* join(fiber)) as S
  })
