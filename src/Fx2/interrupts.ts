import { pipe } from 'hkt-ts'

import { Fiber } from './Fiber.js'
import { Fx } from './Fx.js'
import { flatMap } from './control-flow.js'
import { tuple } from './hkt.js'
import { getFiberId } from './intrinsics.js'

import { Exit } from '@/Exit/Exit.js'
import { FiberId } from '@/FiberId/index.js'

export function interruptAs(id: FiberId) {
  return <E, A>(fiber: Fiber<E, A>): Fx.Of<Exit<E, A>> =>
    pipe(
      fiber.interruptAs(id),
      flatMap(() => fiber.exit),
    )
}

export function interrupt<E, A>(fiber: Fiber<E, A>): Fx.Of<Exit<E, A>> {
  return pipe(
    getFiberId,
    flatMap((id) => interruptAs(id)(fiber)),
  )
}

export function interruptAllAs(id: FiberId) {
  return <Fibers extends readonly Fiber<any, any>[]>(...fibers: Fibers) =>
    tuple(...fibers.map(interruptAs(id)))
}

export function interuptAll<Fibers extends readonly Fiber<any, any>[]>(...fibers: Fibers) {
  return tuple(...fibers.map(interrupt))
}
