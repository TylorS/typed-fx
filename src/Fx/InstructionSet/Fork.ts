import { Fx } from '../Fx'

import { FxInstruction } from './FxInstruction'

import type { Fiber } from '@/Fiber/Fiber'
import type { FiberRuntimeParams } from '@/FiberRuntime/FiberRuntime'

export class Fork<R, E, A> extends FxInstruction<
  readonly [Fx<R, E, A>, ForkParams<R>],
  R,
  never,
  Fiber<E, A>
> {}

export type ForkParams<R> = Partial<
  Omit<FiberRuntimeParams<R, any, any> | FiberRuntimeParams<R, never, any>, 'fiberId' | 'fx'>
>

export const fork = <R, E, A>(
  fx: Fx<R, E, A>,
  params: ForkParams<R> = {},
): Fx<R, never, Fiber<E, A>> => new Fork([fx, params])
