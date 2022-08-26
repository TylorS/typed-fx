import { Just, Maybe, isJust, isNothing } from 'hkt-ts/Maybe'

import type { Live } from '@/Fiber/Fiber.js'
// eslint-disable-next-line import/no-cycle
import * as FiberRef from '@/FiberRef/index.js'
import { Fx, Of, fromExit, getFiberRef } from '@/Fx/Fx.js'
// eslint-disable-next-line import/no-cycle
import { join } from '@/Fx/join.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Service } from '@/Service/Service.js'

export interface Env<R> {
  readonly get: <S extends R>(service: Service<S>) => Of<S>
}

export function Env<R>(): Env<R> {
  return {
    get,
  }
}

function get<S>(id: Service<S>): Of<S> {
  return Fx(function* () {
    const services: ImmutableMap<Service<any>, any> = yield* getFiberRef(FiberRef.Services)
    const service = services.get(id)

    if (isJust(service)) {
      return service.value as S
    }

    const layers: ImmutableMap<
      Service<any>,
      readonly [() => Live<never, any>, Maybe<Live<never, any>>]
    > = yield* getFiberRef(FiberRef.Layers)
    const layer = layers.get(id)

    if (isNothing(layer)) {
      throw new Error(`Unable to find Layer or Service for ${id.description}`)
    }

    const [makeFiber, currentFiber] = layer.value

    if (isJust(currentFiber)) {
      return (yield* fromExit(yield* currentFiber.value.exit)) as S
    }

    const fiber = makeFiber()

    yield* FiberRef.set(layers.set(id, [makeFiber, Just(fiber)]))(FiberRef.Layers)

    return (yield* join(fiber)) as S
  })
}
