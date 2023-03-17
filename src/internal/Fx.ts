import * as Effect from "@effect/io/Effect"
import type { RuntimeFiber } from "@effect/io/Fiber"
import type { Scope } from "@effect/io/Scope"
import type * as fx from "@typed/fx/Fx"
import * as run from "@typed/fx/internal/run"

export function isFx(value: unknown): value is fx.Fx<unknown, unknown, unknown> {
  return isObject(value) && hasRunFunction(value)
}

const isObject = (value: unknown): value is object => value !== null && typeof value === "object"

const hasRunFunction = (value: object): value is fx.Fx<unknown, unknown, unknown> =>
  "run" in value && typeof value["run"] === "function" && value["run"].length === 1

export abstract class BaseFx<R, E, A> implements fx.Fx<R, E, A> {
  abstract readonly name: string

  /**
   * @macro traced
   */
  abstract run(sink: fx.Sink<E, A>): Effect.Effect<R | Scope, never, unknown>

  transform<R2 = never, E2 = never>(
    f: (fx: Effect.Effect<R | Scope, never, unknown>) => Effect.Effect<R2 | Scope, E2, unknown>
  ): fx.Fx<Exclude<R2, Scope>, E | E2, A> {
    return new TransformedFx<R, E, A, R2, E2>(this, f)
  }

  observe<R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>): Effect.Effect<R | R2 | Scope, E | E2, unknown> {
    return run.observe<R, E, A, R2, E2>(this, f)
  }

  forkObserve<R2, E2, B>(
    f: (a: A) => Effect.Effect<R2, E2, B>
  ): Effect.Effect<R | R2 | Scope, never, RuntimeFiber<E | E2, unknown>> {
    return Effect.forkScoped(this.observe(f))
  }

  readonly drain: fx.Fx<R, E, A>["drain"] = run.drain(this)
  readonly forkDrain: fx.Fx<R, E, A>["forkDrain"] = Effect.forkScoped(this.drain)
  readonly collectAll: fx.Fx<R, E, A>["collectAll"] = run.runCollectAll(this)
  readonly forkCollectAll: fx.Fx<R, E, A>["forkCollectAll"] = Effect.forkScoped(this.collectAll)
}

export class TransformedFx<R, E, A, R2, E2> extends BaseFx<Exclude<R2, Scope>, E | E2, A> {
  readonly name = "Transformed" as const

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
