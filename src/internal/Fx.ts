import * as Equal from "@effect/data/Equal"
import * as Hash from "@effect/data/Hash"
import type { Trace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import * as fx from "@typed/fx/Fx"
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

  readonly traced: fx.Fx<R, E, A>["traced"] = (trace) => trace ? new TracedFx(this, trace) : this
  readonly transform: fx.Fx<R, E, A>["transform"] = (f) => new TransformedFx(this, f)

  readonly observe: fx.Fx<R, E, A>["observe"] = (f) => run.observe(this, f)
  readonly forkObserve: fx.Fx<R, E, A>["forkObserve"] = (f) => Effect.forkScoped(this.observe(f))

  readonly drain: fx.Fx<R, E, A>["drain"] = run.drain(this)
  readonly forkDrain: fx.Fx<R, E, A>["forkDrain"] = Effect.forkScoped(this.drain)

  readonly collectAll: fx.Fx<R, E, A>["collectAll"] = run.runCollectAll(this)
  readonly forkCollectAll: fx.Fx<R, E, A>["forkCollectAll"] = Effect.forkScoped(this.collectAll);

  [Hash.symbol]() {
    return Hash.random(this)
  }

  [Equal.symbol](that: Equal.Equal): boolean {
    return this === that
  }
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

export class TracedFx<R, E, A, R2, E2> extends BaseFx<Exclude<R2, Scope>, E | E2, A> {
  readonly name = "Traced" as const

  constructor(
    readonly self: fx.Fx<R, E, A>,
    readonly trace: Trace
  ) {
    super()
  }

  run(sink: fx.Sink<E | E2, A>) {
    return this.self.run(fx.Sink.traced(sink, this.trace)).traced(this.trace) as Effect.Effect<
      Exclude<R2, Scope> | Scope,
      never,
      unknown
    >
  }
}
