import { pipe } from 'hkt-ts'

import * as Fx from './Fx.js'

import * as Fiber from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Scope } from '@/Scope/Scope.js'

export const join = <E, A>(fiber: Fiber.Fiber<E, A>) =>
  pipe(
    fiber.exit,
    Fx.flatMap((exit) =>
      pipe(
        Fiber.inheritFiberRefs(fiber),
        Fx.flatMap(() => Fx.fromExit(exit)),
      ),
    ),
  )

export const forkJoinInContext = <R, E, A>(
  fx: Fx.Fx<R, E, A>,
  context: FiberContext<FiberId.Live>,
): Fx.Fx<R, E, A> => pipe(fx, Fx.forkInContext(context), Fx.flatMap(join))

export const forkJoinIn = <R, E, A>(fx: Fx.Fx<R, E, A>, scope: Scope): Fx.Fx<R, E, A> =>
  pipe(fx, Fx.forkIn(scope), Fx.flatMap(join))

export const forkJoin = <R, E, A>(fx: Fx.Fx<R, E, A>): Fx.Fx<R, E, A> =>
  pipe(fx, Fx.fork, Fx.flatMap(join))
