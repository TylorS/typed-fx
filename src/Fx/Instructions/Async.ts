import type { Either } from 'hkt-ts/Either'

import type { Fx } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

import type { FiberId } from '@/FiberId/FiberId.js'

export class Async<R, E, A> extends FxInstruction<AsyncRegister<R, E, A>, R, E, A> {
  static tag = 'Async' as const
  readonly tag = Async.tag
}

export interface AsyncRegister<R, E, A> {
  (cb: (fx: Fx<R, E, A>) => void, blockingOn: FiberId.Live): Either<Fx<R, never, any>, Fx<R, E, A>>
}
