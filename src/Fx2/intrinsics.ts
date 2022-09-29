import { pipe } from 'hkt-ts'

import type { Env } from './Env.js'
import type { FiberRefs } from './FiberRef.js'
import type { Fx } from './Fx.js'
import { GetEnv, GetFiberId, GetFiberRefs, GetScope, ProvideEnv } from './Instruction.js'
import type { Scope } from './Scope.js'
import { flatMap } from './control-flow.js'

import { FiberId } from '@/FiberId/FiberId.js'
import { Service } from '@/Service/Service.js'

export const getFiberId: Fx.Of<FiberId.Live> = new GetFiberId()

export const getFiberRefs: Fx.Of<FiberRefs> = new GetFiberRefs()

export const getEnv = <R>(): Fx.RIO<R, Env<R>> => new GetEnv<R>()

export const ask = <S>(service: Service<S>): Fx.RIO<S, S> =>
  pipe(
    getEnv<S>(),
    flatMap((env) => env.get(service)),
  )

export const provideEnv =
  <R>(env: Env<R>) =>
  <E, A>(fx: Fx<R, E, A>): Fx<never, E, A> =>
    new ProvideEnv(fx, env)

export const provide =
  <R2>(env: Env<R2>) =>
  <R, E, A>(fx: Fx<R | R2, E, A>): Fx<Exclude<R, R2>, E, A> =>
    pipe(
      getEnv<Exclude<R, R2>>(),
      flatMap((current) => provideEnv((current as Env<R>).join(env))(fx)),
    )

export const provideService =
  <S>(service: Service<S>, impl: S) =>
  <R, E, A>(fx: Fx<R | S, E, A>): Fx<Exclude<R, S>, E, A> =>
    pipe(
      getEnv<Exclude<R, S>>(),
      flatMap((env) => provideEnv((env as Env<R>).add(service, impl))(fx)),
    )

export const getScope: Fx.Of<Scope> = new GetScope()
