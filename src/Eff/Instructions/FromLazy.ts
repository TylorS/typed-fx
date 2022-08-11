import { Lazy, pipe } from 'hkt-ts'

import { Eff } from '@/Eff/Eff.js'
import { handle } from '@/Eff/handle.js'

export class FromLazy<A> extends Eff.Instruction<Lazy<A>, A> {
  static tag = 'FromLazy' as const
  readonly tag = FromLazy.tag
}

export const fromLazy = <A>(f: Lazy<A>, __trace?: string): Eff<FromLazy<A>, A> =>
  new FromLazy(f, __trace)

export function fromValue<A>(value: A, __trace?: string): Eff<FromLazy<A>, A> {
  return fromLazy(() => value, __trace)
}

export function lazy<Y, A>(f: Lazy<Eff<Y, A>>, __trace?: string): Eff<Y | FromLazy<Eff<Y, A>>, A> {
  return Eff(function* () {
    return yield* yield* fromLazy(f, __trace)
  })
}

export function withFromLazy<Y, A>(
  eff: Eff<Y | FromLazy<any>, A>,
): Eff<Exclude<Y, FromLazy<any>>, A> {
  return pipe(
    eff,
    handle(function* (gen, result) {
      while (!result.done) {
        const instr = result.value

        if (instr instanceof FromLazy<any>) {
          result = gen.next(instr.input())
        } else {
          result = gen.next(yield instr as Exclude<Y, FromLazy<any>>)
        }
      }

      return result.value
    }),
  )
}
