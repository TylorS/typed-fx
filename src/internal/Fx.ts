import type { Trace } from "@effect/io/Debug"
import type { Effect } from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import type * as fx from "@typed/fx/Fx"
import { Traced } from "@typed/fx/internal/operator/traced"

export function isFx(value: unknown): value is fx.Fx<unknown, unknown, unknown> {
  return isObject(value) && hasRunFunction(value)
}

const isObject = (value: unknown): value is object => value !== null && typeof value === "object"

const hasRunFunction = (value: object): value is fx.Fx<unknown, unknown, unknown> =>
  "run" in value && typeof value["run"] === "function" && value["run"].length === 1

export abstract class BaseFx<R, E, A> implements fx.Fx<R, E, A> {
  abstract readonly _tag: string

  /**
   * @macro traced
   */
  abstract run<R2>(sink: fx.Sink<R2, E, A>): Effect<R | R2 | Scope, never, void>

  traced(trace: Trace): fx.Fx<R, E, A> {
    return new Traced(this, trace)
  }
}
