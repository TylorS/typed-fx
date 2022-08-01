import { Either, Left } from 'hkt-ts/Either'

import { Eff, unit } from './Eff.js'

export class Async<Y, R, Y2> extends Eff.Instruction<AsyncRegister<Y, R, Y2>, R> {
  readonly tag = 'Async'
}

export interface AsyncRegister<Y, R, Y2> {
  (cb: (fx: Eff<Y, R>) => void): Either<Eff<Y2, unknown>, Eff<Y, R>>
}

export const async = <Y, R, Y2>(
  register: AsyncRegister<Y, R, Y2>,
  __trace?: string,
): Eff<Async<Y, R, Y2> | Y | Y2, R> => new Async(register, __trace)

export const never = async<never, never, never>(() => Left(unit))
