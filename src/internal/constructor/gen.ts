import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"
import { fromFxEffect } from "@typed/fx/internal/constructor/fromFxEffect"
import { BaseFx } from "@typed/fx/internal/Fx"

export const gen = methodWithTrace((trace) =>
  <Eff extends Effect.EffectGen<any, any, any>, R, E, A>(
    f: (resume: EffectResume) => Generator<Eff, Fx<R, E, A>>
  ): Fx<R | GenResources<Eff>, E | GenErrors<Eff>, A> => new GenFx(f).traced(trace)
)

export class GenFx<Eff extends Effect.EffectGen<any, any, any>, R, E, A>
  extends BaseFx<R | GenResources<Eff>, E | GenErrors<Eff>, A>
{
  readonly _tag = "Gen" as const

  constructor(readonly f: (resume: EffectResume) => Generator<Eff, Fx<R, E, A>>) {
    super()
  }

  /**
   * @macro traced
   */
  run<R2>(sink: Sink<R2, E | GenErrors<Eff>, A>) {
    return fromFxEffect<GenResources<Eff>, GenErrors<Eff>, R, E, A>(Effect.gen(this.f)).run(sink)
  }
}

type EffectResume = <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.EffectGen<R, E, A>
type GenResources<Eff> = [Eff] extends [never] ? never : [Eff] extends [Effect.EffectGen<infer R, any, any>] ? R : never
type GenErrors<Eff> = [Eff] extends [never] ? never : [Eff] extends [Effect.EffectGen<any, infer E, any>] ? E : never
