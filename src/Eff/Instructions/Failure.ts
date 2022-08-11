import { pipe } from 'hkt-ts'
import { Left, isLeft } from 'hkt-ts/Either'

import { GetTrace, getTrace } from './Trace.js'

import * as Cause from '@/Cause/Cause.js'
import { Eff } from '@/Eff/Eff.js'
import { handle } from '@/Eff/handle.js'
import { Exit, success } from '@/Exit/Exit.js'

export class Failure<E> extends Eff.Instruction<Cause.Cause<E>, never> {
  static tag = 'Failure' as const
  readonly tag = Failure.tag
}

export function failure<E>(cause: Cause.Cause<E>, __trace?: string): Eff<Failure<E>, never> {
  return new Failure(cause, __trace)
}

export function attempt<Y, E, R>(
  eff: Eff<Y | Failure<E>, R>,
): Eff<Exclude<Y, Failure<E>> | GetTrace, Exit<E, R>> {
  return pipe(
    eff,
    handle(function* (gen, result) {
      try {
        while (!result.done) {
          const instr = result.value

          if (instr instanceof Failure<E>) {
            return Left(instr.input)
          }

          result = gen.next(yield instr as Exclude<Y, Failure<E>>)
        }

        return success(result.value)
      } catch (e) {
        return Left(Cause.traced(yield* getTrace)(Cause.died(e)))
      }
    }),
  )
}

export function catchError<E, Y2, R2>(f: (cause: Cause.Cause<E>) => Eff<Y2, R2>) {
  return <Y, R>(eff: Eff<Y | Failure<E>, R>): Eff<Y | Y2 | GetTrace, R | R2> =>
    Eff(function* () {
      const exit: Exit<E, R> = yield* attempt(eff)

      if (isLeft(exit)) {
        return yield* f(exit.left)
      }

      return exit.right
    })
}

export function fromExit<E, A>(exit: Exit<E, A>): Eff<Failure<E>, A> {
  return Eff(function* () {
    if (isLeft(exit)) {
      return yield* failure<E>(exit.left)
    }

    return exit.right
  })
}

export interface Finalizer<E, A, Y> {
  (exit: Exit<E, A>): Eff<Y, any>
}

export function ensuring<E, A, Y2>(finalizer: Finalizer<E, A, Y2>) {
  return <Y>(eff: Eff<Y | Failure<E>, A>): Eff<Y | Y2 | Failure<E> | GetTrace, A> =>
    Eff(function* () {
      const exit: Exit<E, A> = yield* attempt(eff)

      yield* finalizer(exit)

      return yield* fromExit(exit)
    })
}
