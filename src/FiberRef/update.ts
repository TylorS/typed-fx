import { modify } from './modify'

import { Fx } from '@/Fx/Fx'

export function update<A, R2, E2>(f: (a: A) => Fx<R2, E2, A>) {
  return modify((a: A) =>
    Fx(function* () {
      const a2 = yield* f(a)

      return [a2, a2] as const
    }),
  )
}
