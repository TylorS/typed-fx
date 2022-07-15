import { isRight } from 'hkt-ts/Either'

import { Fx } from '../Fx'

import { fromExit } from './FromExit'
import { zipAll } from './ZipAll'

import type { AnyFiber, Fiber } from '@/Fiber/Fiber'

export const join = <E, A>(fiber: Fiber<E, A>): Fx<never, E, A> =>
  Fx(function* () {
    const exit = yield* fiber.exit

    if (isRight(exit)) {
      yield* fiber.inheritFiberRefs
    }

    return yield* fromExit(exit)
  })

export const joinAll = <Fibers extends ReadonlyArray<AnyFiber>>(
  ...fibers: Fibers
): Fx<
  never,
  Fiber.ErrorsOf<Fibers[number]>,
  { readonly [K in keyof Fibers]: Fiber.OutputOf<Fibers[K]> }
> => zipAll(...fibers.map(join)) as any
