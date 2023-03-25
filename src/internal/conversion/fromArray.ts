import { methodWithTrace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import { BaseFx } from "@typed/fx/internal/BaseFx"
import type { Fx, Sink } from "@typed/fx/internal/Fx"

export const fromArray: <const T extends ReadonlyArray<any>>(array: T) => Fx<never, never, T[number]> =
  methodWithTrace((trace) =>
    <const T extends ReadonlyArray<any>>(array: T): Fx<never, never, T[number]> =>
      new FromArrayFx(array).traced(trace)
  )

export class FromArrayFx<T extends ReadonlyArray<any>> extends BaseFx<never, never, T[number]> {
  readonly name = "FromArray" as const

  constructor(readonly array: T) {
    super()
  }

  run(sink: Sink<never, T[number]>) {
    return Effect.matchCauseEffect(Effect.forEachDiscard(this.array, sink.event), sink.error, sink.end)
  }
}
