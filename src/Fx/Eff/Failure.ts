import { Left, Right } from 'hkt-ts/Either'

import { Trace } from '../Trace/Trace'

import { AddTrace } from './Trace'

import * as Cause from '@/Fx/Cause/Cause'
import { Eff } from '@/Fx/Eff/Eff'
import { Exit } from '@/Fx/Exit/Exit'

export class Failure<E> implements Eff<Failure<E> | AddTrace, never, never> {
  readonly tag = 'Fail'
  constructor(
    readonly cause: Cause.Cause<E>,
    // eslint-disable-next-line @typescript-eslint/ban-types
    readonly __trace?: string,
  ) {}

  *[Symbol.iterator](): ReturnType<
    Eff<Failure<E> | AddTrace, never, never>[typeof Symbol.iterator]
  > {
    yield* new AddTrace(Trace.runtime({}, this[Symbol.iterator]))

    if (this.__trace) {
      yield* new AddTrace(Trace.custom(this.__trace))
    }

    return (yield this) as never
  }
}

export function failure<E>(
  cause: Cause.Cause<E>,
  __trace?: string,
): Eff<Failure<E> | AddTrace, never, never> {
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
      return Left(
        new Cause.Traced<E>(new Cause.Died(e), Trace.runtime(e instanceof Error ? e : {})),
      )
    }
  })
}
