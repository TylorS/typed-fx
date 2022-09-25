import { flow, pipe } from 'hkt-ts/function'

import * as Fx from './Fx.js'
import { forkJoinInContext, join } from './join.js'

import * as L from '@/Logger/Logger.js'
import { Platform } from '@/Platform/index.js'
import { Runtime } from '@/Runtime/Runtime.js'
import { Supervisor } from '@/Supervisor/Supervisor.js'

export function withPlatform(
  platform: Platform,
  __trace?: string,
): <R, E, A>(fx: Fx.Fx<R, E, A>) => Fx.Fx<R, E, A> {
  return (fx) =>
    pipe(
      Fx.getFiberContext,
      Fx.flatMap((ctx) => pipe(fx, forkJoinInContext(ctx.fork({ platform }))), __trace),
    )
}

export function withSupervisor<B>(
  supervisor: Supervisor<B>,
  __trace?: string,
): <R, E, A>(fx: Fx.Fx<R, E, A>) => Fx.Fx<R, E, A> {
  return (fx) =>
    pipe(
      Fx.getFiberContext,
      Fx.flatMap((ctx) => pipe(fx, forkJoinInContext(ctx.fork({ supervisor }))), __trace),
    )
}

export function withLogger<B>(
  f: (l: L.Logger<string, any>) => L.Logger<string, B>,
  __trace?: string,
): <R, E, A>(fx: Fx.Fx<R, E, A>) => Fx.Fx<R, E, A> {
  return (fx) =>
    pipe(
      Fx.getFiberContext,
      Fx.flatMap(
        (ctx) => pipe(fx, forkJoinInContext(ctx.fork({ logger: f(ctx.logger) }))),
        __trace,
      ),
    )
}

export function addLogger<B>(
  logger: L.Logger<string, B>,
  __trace?: string,
): <R, E, A>(fx: Fx.Fx<R, E, A>) => Fx.Fx<R, E, A> {
  return withLogger((l) => L.both(logger)(l), __trace)
}

export function eitherLogger<B>(
  logger: L.Logger<string, B>,
  __trace?: string,
): <R, E, A>(fx: Fx.Fx<R, E, A>) => Fx.Fx<R, E, A> {
  return withLogger((l) => L.either(logger)(l), __trace)
}

export function withinRuntime<R>(runtime: Runtime<R>): <E, A>(fx: Fx.Fx<R, E, A>) => Fx.IO<E, A> {
  return flow(runtime.runFiber, join)
}
