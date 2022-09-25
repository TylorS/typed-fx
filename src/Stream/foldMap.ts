import { Maybe, flow, pipe } from 'hkt-ts'
import * as Endo from 'hkt-ts/Endomorphism'
import { Identity } from 'hkt-ts/Typeclass/Identity'
import * as B from 'hkt-ts/boolean'

import { Stream } from './Stream.js'
import { FilterMapStream, MapStream } from './bimap.js'
import { observeLazy } from './drain.js'
import { FromFxStream } from './fromFx.js'

import * as Fx from '@/Fx/index.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'

export const filterFoldMap = <A>(I: Identity<A>) => {
  const foldMap_ =
    <B>(f: (b: B) => Maybe.Maybe<A>, __trace?: string) =>
    <R, E>(stream: Stream<R, E, B>): Fx.Fx<R | Scheduler, E, A> => {
      if (stream instanceof FromFxStream) {
        return pipe(
          stream.fx,
          Fx.map(
            flow(
              f,
              Maybe.match(
                () => I.id,
                (a) => I.concat(I.id, a),
              ),
            ),
          ),
        )
      }

      if (stream instanceof MapStream) {
        return foldMap_(flow(stream.f, f), __trace)(stream.stream)
      }

      if (stream instanceof FilterMapStream) {
        return foldMap_(flow(stream.f, Maybe.flatMap(f)), __trace)(stream.stream)
      }

      return filterFoldMapStream(I, f, stream, __trace)
    }

  return foldMap_
}

export const foldMap =
  <A>(I: Identity<A>) =>
  <B>(f: (b: B) => A) =>
    filterFoldMap(I)(flow(f, Maybe.Just))

const filterFoldMapStream = <A, B, R, E>(
  I: Identity<A>,
  f: (b: B) => Maybe.Maybe<A>,
  stream: Stream<R, E, B>,
  __trace?: string,
) =>
  Fx.lazy(() => {
    let acc = I.id

    return pipe(
      stream,
      observeLazy((b) => {
        const maybe = f(b)

        if (Maybe.isJust(maybe)) {
          acc = I.concat(acc, maybe.value)
        }
      }),
      Fx.flatJoinTo(() => acc, __trace),
    )
  })

export const reduce = <A, B>(
  f: (a: A, b: B) => A,
  seed: A,
): (<R, E>(stream: Stream<R, E, B>) => Fx.Fx<Scheduler | R, E, A>) => {
  return flow(
    foldMap(Endo.makeIdentity<A>())((a: B) => (b: A) => f(b, a)),
    Fx.flap(seed),
  )
}

export const every = foldMap(B.All)
export const some = foldMap(B.Any)
