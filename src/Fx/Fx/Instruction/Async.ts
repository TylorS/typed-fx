import { Either, Left } from 'hkt-ts/Either'

import { Fx, unit } from '../Fx.js'

import { Eff } from '@/Fx/Eff/index.js'

export class Async<R, E, A> extends Eff.Instruction<AsyncRegister<R, E, A>, A> {
  readonly tag = 'Async'
}

export interface AsyncRegister<R, E, A> {
  (cb: (fx: Fx<R, E, A>) => void): Either<Fx<R, never, unknown>, Fx<R, E, A>>
}

export const async = <R, E, A>(register: AsyncRegister<R, E, A>, __trace?: string): Fx<R, E, A> =>
  new Async(register, __trace)

export const never = async<never, never, never>(() => Left(unit))
