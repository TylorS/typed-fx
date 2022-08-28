import { constant, identity, pipe } from 'hkt-ts'
import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'
import { Second } from 'hkt-ts/Typeclass/Concat'
import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'
import { NonNegativeInteger } from 'hkt-ts/number'

// eslint-disable-next-line import/no-cycle
import { Env } from '@/Env/Env.js'
import type { Live } from '@/Fiber/Fiber.js'
import { Fx, getFiberContext, map, now } from '@/Fx/Fx.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { LogAnnotation } from '@/Logger/LogAnnotation.js'
import { LogSpan } from '@/Logger/LogSpan.js'
import { Semaphore } from '@/Semaphore/Semaphore.js'
import { Service } from '@/Service/Service.js'
import { EmptyTrace, Trace } from '@/Trace/Trace.js'

export class FiberRef<R, E, A> {
  constructor(
    readonly initial: Fx<R, E, A>,
    readonly fork: (a: A) => Maybe<A> = Just,
    readonly join: (current: A, incoming: A) => A = Second.concat,
    readonly Eq: Eq<A> = DeepEquals,
  ) {}

  static make = make
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends FiberRef<infer _R, infer _E, infer _A> ? _R : never
export type ErrorsOf<T> = T extends FiberRef<infer _R, infer _E, infer _A> ? _E : never
export type OutputOf<T> = T extends FiberRef<infer _R, infer _E, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export type AnyFiberRef =
  | FiberRef<any, any, any>
  | FiberRef<never, never, any>
  | FiberRef<never, any, any>
  | FiberRef<any, never, any>

export function make<R, E, A>(initial: Fx<R, E, A>, params: Params<A> = {}): FiberRef<R, E, A> {
  return new FiberRef(initial, params.fork, params.join, params.Eq)
}

export type Params<A> = {
  readonly fork?: (a: A) => Maybe<A>
  readonly join?: (current: A, incoming: A) => A
  readonly Eq?: Eq<A>
}

export const CurrentEnv = make(
  pipe(
    getFiberContext,
    map((c) => Env<any>(c.fiberRefs)),
  ),
  {
    fork: constant(Nothing), // Always create a new Env for each Fiber.
    join: identity, // Always keep the parent Fiber's Env
  },
)

export const CurrentConcurrencyLevel = make(
  now<Semaphore>(new Semaphore(NonNegativeInteger(Infinity))),
  {
    join: identity, // Always keep the parent Fiber's concurrency level
  },
)

export const CurrentInterruptStatus = make(now<boolean>(true), {
  join: identity, // Always keep the parent Fiber's interrupt status
})

export const CurrentTrace = make(now<Trace>(EmptyTrace), {
  join: identity, // Always keep the parent Fiber's trace
})

export const Layers = FiberRef.make(
  now(ImmutableMap<Service<any>, readonly [() => Live<never, any>, Maybe<Live<never, any>>]>()),
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
