import { pipe } from 'hkt-ts'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Pool, PoolRange } from './Pool.js'
import { None, PoolStategy, TimeToLive } from './PoolStrategy.js'

import { Env } from '@/Env/Env.js'
import * as Fiber from '@/Fiber/index.js'
import * as Fx from '@/Fx/index.js'
import { GlobalScope } from '@/Scope/GlobalScope.js'
import { Scope } from '@/Scope/Scope.js'
import { Delay } from '@/Time/index.js'

export function makeFixed<R, E, A>(creator: Fx.Fx<R | Scope, E, A>, size: NonNegativeInteger) {
  return makeWith(creator, { min: size, max: size }, None)
}

export function make<R, E, A>(
  creator: Fx.Fx<R | Scope, E, A>,
  range: PoolRange,
  timeToLive: Delay,
) {
  return makeWith(creator, range, new TimeToLive(timeToLive))
}

export function makeWith<R, E, A, R2, S>(
  creator: Fx.Fx<R | Scope, E, A>,
  range: PoolRange,
  strategy: PoolStategy<R2, S, E, A>,
): Fx.Fx<R | R2 | Scope, never, Pool<E, A>> {
  return Fx.Fx(function* () {
    const initial: S = yield* strategy.initial
    const resources: Env<R> = yield* Fx.getEnv<R>()
    const scope: Scope = yield* Fx.ask(Scope)
    const pool: Pool<E, A> = Pool(
      pipe(creator, Fx.provide(resources.add(Scope, scope))),
      range,
      strategy.track(initial),
    )
    const fiber = yield* Fx.forkIn(GlobalScope)(pool.initialize)
    const shrink = yield* Fx.forkIn(GlobalScope)(
      strategy.run(initial, pool.excess, pipe(pool.shrink, Fx.mapTo(undefined))),
    )

    scope.ensuring(() =>
      Fx.zipAll([Fiber.interrupt(fiber), Fiber.interrupt(shrink), pool.shutdown]),
    )

    return pool
  })
}
