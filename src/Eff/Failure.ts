import { Left, Right } from 'hkt-ts/Either'

import * as Cause from '@/Cause/Cause'
import { Eff } from '@/Eff/Eff'
import { Exit, die } from '@/Exit/Exit'

export class Failure<E> implements Eff<Failure<E>, never, never> {
  readonly tag = 'Fail'
  constructor(readonly cause: Cause.Cause<E>, readonly __trace?: string) {}

  *[Symbol.iterator]() {
    return (yield this) as never
  }
}

export function failure<E>(cause: Cause.Cause<E>, __trace?: string): Eff<Failure<E>, never, never> {
  return new Failure(cause, __trace)
}

export function attempt<Y, E, R, N>(
  sync: Eff<Y | Failure<E>, R, N>,
): Eff<Exclude<Y, Failure<E>>, Exit<E, R>, N> {
  return Eff(function* () {
    try {
      const gen = sync[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        const instr = result.value

        if (instr instanceof Failure<E>) {
          return Left(instr.cause)
        }

        result = gen.next((yield instr as Exclude<Y, Failure<E>>) as N)
      }

      return Right(result.value)
    } catch (e) {
      return die(e)
    }
  })
}
