import { Either } from 'hkt-ts/Either'

import { Fx } from '../Fx'

import { FxInstruction } from './FxInstruction'

import * as FiberId from '@/FiberId/FiberId'

export class Async<R, E, A> extends FxInstruction<
  {
    // Uses Left to register a Finalizer
    // Uses Right to automatically return a value
    readonly register: (cb: (_: Fx<R, E, A>) => void) => Either<Fx<R, never, void>, Fx<R, E, A>>
    readonly blockingOn: FiberId.FiberId
  },
  R,
  E,
  A
> {}

export function async<R, E, A>(
  register: (cb: (_: Fx<R, E, A>) => void) => Either<Fx<R, never, void>, Fx<R, E, A>>,
  blockingOn: FiberId.FiberId = FiberId.None,
): Fx<R, E, A> {
  return new Async({ register, blockingOn })
}
