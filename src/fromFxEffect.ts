import { Effect, pipe } from 'effect'

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

export function fromFxGen<Eff extends Effect.EffectGen<any, any, any>, R2, E2, A>(
  f: (
    adapter: <R3, E3, A3>(effect: Effect.Effect<R3, E3, A3>) => Effect.EffectGen<R3, E3, A3>,
  ) => Generator<Eff, Fx<R2, E2, A>, any>,
): Fx<
  [Eff] extends [never] ? never : [Eff] extends [{ _R: () => infer R }] ? R : never | R2,
  [Eff] extends [never] ? never : [Eff] extends [{ _E: () => infer E }] ? E : never | E2,
  A
> {
  return fromFxEffect(Effect.gen(f)) as any
}
