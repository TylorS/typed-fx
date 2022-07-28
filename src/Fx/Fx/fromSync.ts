import { pipe } from 'hkt-ts'

import { provide } from '../Eff/Access.js'
import { Sync } from '../Sync/Sync.js'

import { Fx, access } from './Fx.js'

export function fromSync<R, E, A>(sync: Sync<R, E, A>): Fx<R, E, A> {
  return access((env) =>
    Fx(function* () {
      return yield* pipe(sync, provide(yield* env.toSync))
    }),
  )
}
