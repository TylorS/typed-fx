import * as Effect from '@effect/core/io/Effect'
import { pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'

export function fromFxEffect<R, E, R2, E2, A>(
  effectFx: Effect.Effect<R, E, Fx<R2, E2, A>>,
): Fx<R | R2, E | E2, A> {
  return Fx((emitter) =>
    pipe(
      effectFx,
      Effect.foldCauseEffect(emitter.failCause, (fx) => fx.run(emitter)),
    ),
  )
}

export function fromFxGen<Eff extends Effect.GenEffect<any, any, any>, R2, E2, A>(
  f: (i: Effect.Adapter) => Generator<Eff, Fx<R2, E2, A>, any>,
): Fx<
  [Eff] extends [{ [Effect._GenR]: () => infer R }] ? R : never | R2,
  [Eff] extends [{ [Effect._GenE]: () => infer E }] ? E : never | E2,
  A
> {
  return fromFxEffect<
    [Eff] extends [{ [Effect._GenR]: () => infer R }] ? R : never,
    [Eff] extends [{ [Effect._GenE]: () => infer E }] ? E : never,
    R2,
    E2,
    A
  >(Effect.gen(f)) as any
}
