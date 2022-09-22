import { flow, pipe } from 'hkt-ts'
import * as Endo from 'hkt-ts/Endomorphism'
import { Identity } from 'hkt-ts/Typeclass/Identity'
import * as B from 'hkt-ts/boolean'

import { Stream } from './Stream.js'
import { observe } from './drain.js'

import * as Fx from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'

export const foldMap =
  <A>(I: Identity<A>) =>
  <B>(f: (b: B) => A) =>
  <R, E>(stream: Stream<R, E, B>): Fx.Fx<R | Scheduler, E, A> =>
    Fx.lazy(() => {
      let acc = I.id

      return pipe(
        stream,
        observe((b) =>
          Fx.fromLazy(() => {
            acc = I.concat(acc, f(b))
          }),
        ),
        Fx.flatMap(Fx.join),
        Fx.map(() => acc),
      )
    })

export const reduce = <A, B>(f: (a: A, b: B) => A, seed: A) => {
  return flow(
    foldMap(Endo.makeIdentity<A>())((a: B) => (b: A) => f(b, a)),
    Fx.flap(seed),
  )
}

export const every = foldMap(B.All)
export const some = foldMap(B.Any)
