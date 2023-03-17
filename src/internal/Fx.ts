import type { Trace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import type * as fx from "@typed/fx/Fx"

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
  abstract run(sink: fx.Sink<E, A>): Effect.Effect<R | Scope, never, unknown>

  traced(trace: Trace): fx.Fx<R, E, A> {
    return trace ? new Traced(this, trace) : this
  }

  transform<R2 = never, E2 = never>(
    f: (fx: Effect.Effect<R | Scope, never, unknown>) => Effect.Effect<R2 | Scope, E2, unknown>
  ): fx.Fx<Exclude<R2, Scope>, E | E2, A> {
    return new TransformedFx<R, E, A, R2, E2>(this, f)
  }
}

export class Traced<R, E, A> implements fx.Fx<R, E, A> {
  readonly _tag = "Traced"
  constructor(readonly fx: fx.Fx<R, E, A>, readonly trace: Trace) {}

  run(sink: fx.Sink<E, A>): Effect.Effect<R | Scope, never, void> {
    const { fx, trace } = this

    return fx.run(sink).traced(trace)
  }

  traced(trace: Trace): fx.Fx<R, E, A> {
    return trace ? new Traced(this.fx, trace) : this
  }

  transform<R2 = never, E2 = never>(
    f: (fx: Effect.Effect<R | Scope, never, unknown>) => Effect.Effect<R2 | Scope, E2, unknown>
  ): fx.Fx<Exclude<R2, Scope>, E | E2, A> {
    return new TransformedFx<R, E, A, R2, E2>(this, f)
  }
}

export class TransformedFx<R, E, A, R2, E2> extends BaseFx<Exclude<R2, Scope>, E | E2, A> {
  readonly _tag = "Transformed" as const

  constructor(
    readonly self: fx.Fx<R, E, A>,
    readonly f: (fx: Effect.Effect<R | Scope, never, unknown>) => Effect.Effect<R2 | Scope, E2, unknown>
  ) {
    super()
  }

  run(sink: fx.Sink<E | E2, A>): Effect.Effect<Scope | Exclude<R2, Scope>, never, unknown> {
    return Effect.catchAllCause(this.f(this.self.run(sink)), sink.error) as Effect.Effect<
      Exclude<R2, Scope> | Scope,
      never,
      unknown
    >
  }
}
