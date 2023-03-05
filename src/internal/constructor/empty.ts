import type { Effect } from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import type { Fx, Sink } from "@typed/fx/Fx"
import { BaseFx } from "@typed/fx/internal/Fx"

export class EmptyFx extends BaseFx<never, never, never> {
  readonly _tag = "Empty"
  run<R>(sink: Sink<R, never, never>): Effect<R | Scope, never, void> {
    return sink.end
  }
}

export const empty: Fx<never, never, never> = new EmptyFx()
