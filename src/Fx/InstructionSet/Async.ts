import { Either } from 'hkt-ts/Either'

import { Fx } from '../Fx'

import { FxInstruction } from './FxInstruction'

export class Async<R, E, A> extends FxInstruction<AsyncRegister<R, E, A>, R, E, A> {}

// Uses Left to register a Finalizer
// Uses Right to automatically return a value
export type AsyncRegister<R, E, A> = (
  cb: (fx: Fx<R, E, A>) => void,
) => Either<Fx<R, never, void>, Fx<R, E, A>>

export function async<R, E, A>(register: AsyncRegister<R, E, A>, __trace?: string): Fx<R, E, A> {
  return new Async(register, __trace)
}
