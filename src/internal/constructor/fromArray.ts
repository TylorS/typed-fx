import { methodWithTrace } from "@effect/io/Debug"
import { forEachDiscard, matchCauseEffect } from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export const fromArray: <T extends ReadonlyArray<any>>(array: readonly [...T]) => Fx<never, never, T[number]> =
  methodWithTrace((trace) =>
    <T extends ReadonlyArray<any>>(array: readonly [...T]): Fx<never, never, T[number]> =>
      new FromArrayFx(array).traced(trace)
  )

export class FromArrayFx<T extends ReadonlyArray<any>> extends BaseFx<never, never, T[number]> {
  readonly _tag = "FromArray" as const

  constructor(readonly array: T) {
    super()
  }

  run<R>(sink: Sink<R, never, T[number]>) {
    return matchCauseEffect(forEachDiscard(this.array, sink.event), sink.error, () => sink.end)
  }
}
