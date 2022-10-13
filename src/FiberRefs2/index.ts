import { Maybe } from 'hkt-ts/Maybe'

import { FiberRef } from '@/FiberRef/FiberRef.js'
import { Fx } from '@/Fx/index.js'

export interface FiberRefs {
  readonly getAll: Fx.Of<readonly [FiberRef<any, any, any>, any]>

  readonly get: <R, E, A>(fiberRef: FiberRef<R, E, A>) => Fx<R, E, A>

  readonly modify: <R, E, A, R2, E2, B>(
    fiberRef: FiberRef<R, E, A>,
    f: (a: A) => Fx<R2, E2, readonly [B, A]>,
  ) => Fx<R, E, B>

  readonly delete: <R, E, A>(fiberRef: FiberRef<R, E, A>) => Fx<R, E, Maybe<A>>

  readonly locally: <R, E, A, R2, E2, B>(
    fiberRef: FiberRef<R, E, A>,
    value: A,
    fx: Fx<R2, E2, B>,
  ) => Fx<R2, E2, B>

  readonly fork: () => FiberRefs

  readonly join: (fiberRefs: FiberRefs) => void
}
