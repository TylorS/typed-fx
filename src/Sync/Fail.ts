import { Left, Right } from 'hkt-ts/Either'

import { Sync } from './Sync'

import * as Cause from '@/Cause/Cause'
import { Eff } from '@/Eff/Eff'
import { Exit, die } from '@/Exit/Exit'

export class Fail<E> implements Eff<Fail<E>, never, never> {
  readonly tag = 'Fail'
  constructor(readonly cause: Cause.Cause<E>) {}

  *[Symbol.iterator]() {
    return (yield this) as never
  }
}

export function fail<E>(cause: Cause.Cause<E>): Sync<never, E, never>
export function fail<E>(cause: Cause.Cause<E>): Eff<Fail<E>, never, never>
export function fail<E>(cause: Cause.Cause<E>): Eff<Fail<E>, never, never> {
  return new Fail(cause)
}

export function attempt<Y, E, R, N>(
  sync: Eff<Y | Fail<E>, R, N>,
): Eff<Exclude<Y, Fail<E>>, Exit<E, R>, N> {
  return Eff(function* () {
    try {
      const gen = sync[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        const instr = result.value

        if (instr instanceof Fail<E>) {
          return Left(instr.cause)
        }

        result = gen.next((yield instr as Exclude<Y, Fail<E>>) as N)
      }

      return Right(result.value)
    } catch (e) {
      return die(e)
    }
  })
}
