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

export const flatJoin: <R, E, E2, B>(
  fx: Fx.Fx<R, E, Fiber.Fiber<E2, B>>,
  __trace?: string,
) => Fx.Fx<R, E | E2, B> = Fx.flatMap(join)

export const forkJoinInContext =
  (context: FiberContext<FiberId.Live>) =>
  <R, E, A>(fx: Fx.Fx<R, E, A>): Fx.Fx<R, E, A> =>
    pipe(fx, Fx.forkInContext({ ...context, async: false }), flatJoin)

export const forkJoinIn = <R, E, A>(fx: Fx.Fx<R, E, A>, scope: Scope): Fx.Fx<R, E, A> =>
  pipe(
    Fx.getFiberContext,
    Fx.flatMap((ctx) =>
      pipe(fx, Fx.forkInContext({ ...ctx, scope: scope.fork(), async: false }), flatJoin),
    ),
  )

export const forkJoin = <R, E, A>(fx: Fx.Fx<R, E, A>): Fx.Fx<R, E, A> =>
  pipe(fx, Fx.forkSync, flatJoin)

export const flatJoinMap =
  <B, C>(f: (b: B) => C, __trace?: string) =>
  <R, E, E2>(fx: Fx.Fx<R, E, Fiber.Fiber<E2, B>>): Fx.Fx<R, E | E2, C> =>
    pipe(fx, Fx.flatMap(join), Fx.map(f, __trace))
