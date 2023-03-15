import { millis } from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as Deferred from "@effect/io/Deferred"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import * as Ref from "@effect/io/Ref"
import * as Schedule from "@effect/io/Schedule"
import type { Scope } from "@effect/io/Scope"
import type { Fx, Sink } from "@typed/fx/Fx"
import { Cause } from "@typed/fx/internal/_externals"
import { observe } from "@typed/fx/internal/run"

const zero = millis(0)
export const asap = Schedule.delayed(Schedule.once(), () => zero)

export class RefCounter {
  protected count = Ref.unsafeMake(this.initial)
  protected fiber: Fiber.RuntimeFiber<never, void> | undefined

  constructor(readonly initial: number, readonly deferred: Deferred.Deferred<never, void>) {}

  readonly get = Ref.get(this.count)

  readonly increment = pipe(
    this.count,
    Ref.updateAndGet((x) => x + 1)
  )

  readonly decrement = pipe(
    this.count,
    Ref.updateAndGet((x) => Math.max(0, x - 1)),
    Effect.tap(() => this.checkShouldClose)
  )

  readonly wait = Deferred.await(this.deferred)

  readonly run = <R, E, A, R2>(
    fx: Fx<R, E, A>,
    sink: Sink<R2, E, A>
  ): Effect.Effect<R | R2 | Scope, never, unknown> =>
    pipe(
      this.increment,
      Effect.zipRight(observe(fx, sink.event)),
      Effect.matchCauseEffect(
        (cause): Effect.Effect<Scope | R2, never, unknown> =>
          Cause.isInterruptedOnly(cause) ? this.decrement : sink.error(cause),
        () => this.decrement
      )
    )

  private checkShouldClose = Effect.suspendSucceed(() => {
    const interrupt = this.fiber ? Fiber.interrupt(this.fiber) : Effect.unit()

    this.fiber = undefined

    return pipe(
      interrupt,
      Effect.flatMap(() => Ref.get(this.count)),
      Effect.flatMap((x) => x === 0 ? Effect.intoDeferred(Effect.unit(), this.deferred) : Effect.unit()),
      Effect.scheduleForked(asap),
      Effect.tap((fiber) =>
        Effect.sync(() => {
          this.fiber = fiber
        })
      )
    )
  })
}

export function withRefCounter<R, E, A, R2, E2, B>(
  initialCount: number,
  f: (counter: RefCounter) => Effect.Effect<R, E, A>,
  onEnd: () => Effect.Effect<R2, E2, B>
): Effect.Effect<R | R2 | Scope, E | E2, B> {
  return Effect.gen(function*($) {
    const deferred = yield* $(Deferred.make<never, void>())
    const counter = new RefCounter(initialCount, deferred)

    const fiber = yield* $(Effect.forkScoped(f(counter)))

    yield* $(counter.wait)

    yield* $(Fiber.interrupt(fiber))

    return yield* $(onEnd())
  })
}
