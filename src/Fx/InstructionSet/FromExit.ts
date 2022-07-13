import { flow } from 'hkt-ts'

import type { IO } from '../Fx'

import { FxInstruction } from './FxInstruction'

import * as Exit from '@/Exit/Exit'

export class FromExit<out E = never, out A = never> extends FxInstruction<
  Exit.Exit<E, A>,
  never,
  E,
  A
> {}

export const fromExit = <E = never, A = never>(exit: Exit.Exit<E, A>): IO<E, A> =>
  new FromExit(exit)

export const success = flow(Exit.success, fromExit)
export const die = flow(Exit.die, fromExit)
export const failure = flow(Exit.failure, fromExit)
export const fromEither = flow(Exit.fromEither, fromExit)
export const interrupt = flow(Exit.interrupt, fromExit)
export const unit = success<void>(undefined)
