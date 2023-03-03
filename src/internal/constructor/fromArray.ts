import { forEachDiscard, matchCauseEffect } from "@effect/io/Effect"
import type { Fx, Sink } from "@typed/fx/Fx"

export function fromArray<T extends ReadonlyArray<any>>(array: readonly [...T]): Fx<never, never, T[number]> {
  return new FromArrayFx(array)
}

export class FromArrayFx<T extends ReadonlyArray<any>> implements Fx<never, never, T[number]> {
  readonly _tag = "FromArray" as const

  constructor(readonly array: T) {}

  /**
   * @macro traced
   */
  run<R>(sink: Sink<R, never, T[number]>) {
    return matchCauseEffect(forEachDiscard(this.array, sink.event), sink.error, () => sink.end)
  }
}
