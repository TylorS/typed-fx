import { Left, Right } from 'hkt-ts/Either'

import { AddTrace } from './Trace.js'

import * as Cause from '@/Fx/Cause/Cause.js'
import { Eff } from '@/Fx/Eff/Eff.js'
import { Exit } from '@/Fx/Exit/Exit.js'
import { Trace } from '@/Fx/Trace/Trace.js'

export class Failure<E> extends Eff.Instruction<Cause.Cause<E>, never> {}

export function failure<E>(cause: Cause.Cause<E>, __trace?: string): Eff<Failure<E>, never> {
  return new Failure(cause, __trace)
}

export function attempt<Y, E, R>(
  sync: Eff<Y | Failure<E>, R>,
): Eff<Exclude<Y, Failure<E>> | AddTrace, Exit<E, R>> {
  return Eff(function* attempt() {
    try {
      const gen = sync[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        const instr = result.value

        if (instr instanceof Failure<E>) {
          // Always add the latest Runtime Trace to give the user the most amount of information
          yield* new AddTrace(Trace.runtime({}, attempt))

          // Append Custom trace if available
          if (instr.__trace) {
            yield* new AddTrace(Trace.custom(instr.__trace))
          }

          return Left(instr.input)
        }

        result = gen.next(yield instr as Exclude<Y, Failure<E>>)
      }

      return Right(result.value)
    } catch (e) {
      // Always add the latest Runtime Trace to give the user the most amount of information
      yield* new AddTrace(Trace.runtime(e instanceof Error ? e : {}, attempt))

      return Left(new Cause.Died(e))
    }
  })
}
