import * as Equal from "@effect/data/Equal"
import { identity } from "@effect/data/Function"
import * as Hash from "@effect/data/Hash"
import type { Trace } from "@effect/io/Debug"
import * as Effect from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import type * as fx from "@typed/fx/Fx"
import * as run from "@typed/fx/internal/run"

export function isFx(value: unknown): value is fx.Fx<unknown, unknown, unknown> {
  return isObject(value) && hasRunFunction(value)
}

const isObject = (value: unknown): value is object => value !== null && typeof value === "object"

const hasRunFunction = (value: object): value is fx.Fx<unknown, unknown, unknown> =>
  "run" in value && typeof value["run"] === "function" && value["run"].length === 1

export class FxEffect<R, E, A> implements Effect.Effect<R, E, A> {
  readonly [Effect.EffectTypeId] = {
    _R: identity,
    _E: identity,
    _A: identity
  }

  constructor(readonly value: Effect.Effect<R, E, A>) {
    Object.assign(this, value)
  }

  [Hash.symbol]() {
    return Hash.random(this)
  }

  [Equal.symbol](that: unknown): boolean {
    return this === that
  }

  traced(trace: Trace): Effect.Effect<R, E, A> {
    return this.value.traced(trace)
  }
}

export abstract class BaseFx<R, E, A> extends FxEffect<R | Scope, E, unknown> implements fx.Fx<R, E, A> {
  abstract readonly name: string

  /**
   * @macro traced
   */
  abstract run(sink: fx.Sink<E, A>): Effect.Effect<R | Scope, never, unknown>

  constructor() {
    super(Effect.suspendSucceed(() => run.drain<R, E, A>(this)))
  }

  transform<R2 = never, E2 = never>(
    f: (fx: Effect.Effect<R | Scope, never, unknown>) => Effect.Effect<R2 | Scope, E2, unknown>
  ): fx.Fx<Exclude<R2, Scope>, E | E2, A> {
    return new TransformedFx<R, E, A, R2, E2>(this, f)
  }

  observe<R2, E2, B>(f: (a: A) => Effect.Effect<R2, E2, B>): Effect.Effect<R | R2 | Scope, E | E2, unknown> {
    return run.observe<R, E, A, R2, E2>(this, f)
  }

  readonly fork = Effect.suspendSucceed(() => Effect.forkScoped(this.value))
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
