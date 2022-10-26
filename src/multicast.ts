import * as Cause from '@effect/core/io/Cause'
import * as Deferred from '@effect/core/io/Deferred'
import * as Effect from '@effect/core/io/Effect'
import * as Fiber from '@effect/core/io/Fiber'
import { Scope } from '@effect/core/io/Scope'
import { pipe } from '@fp-ts/data/Function'
import { Env } from '@tsplus/stdlib/service/Env'

import { Emitter, Push } from './Push.js'
import { asap } from './_internal.js'

export function multicast<R, E, A>(push: Push<R, E, A>): Push<R, E, A> {
  return new Multicast(push)
}

export interface MulticastObserver<E, A> {
  readonly emitter: Emitter<any, E, A>
  readonly env: Env<any>
  readonly deferred: Deferred.Deferred<never, void>
}

export class Multicast<R, E, A> implements Push<R, E, A>, Emitter<never, E, A> {
  protected observers: MulticastObserver<E, A>[] = []
  protected fiber: Fiber.Fiber<never, unknown> | undefined

  constructor(readonly push: Push<R, E, A>) {
    this.emit = this.emit.bind(this)
    this.failCause = this.failCause.bind(this)
  }

  run<RO>(emitter: Emitter<RO, E, A>): Effect.Effect<R | RO | Scope, never, unknown> {
    return pipe(
      Effect.environment<RO>(),
      Effect.zip(Deferred.make<never, void>()),
      Effect.tap(([env, deferred]) =>
        Effect.suspendSucceed(() => {
          this.observers.push({ emitter, env, deferred })

          return this.fiber
            ? Effect.unit
            : pipe(
                this.push.run(this),
                Effect.schedule(asap),
                Effect.forkScoped,
                Effect.tap((fiber) => Effect.sync(() => (this.fiber = fiber))),
              )
        }),
      ),
      Effect.flatMap(([, deferred]) => deferred.await),
    )
  }

  emit(a: A) {
    return Effect.suspendSucceed(() =>
      Effect.forEachDiscard(this.observers.slice(), (observer) => this.runEvent(a, observer)),
    )
  }

  failCause(e: Cause.Cause<E>) {
    return pipe(
      Effect.suspendSucceed(() =>
        Effect.forEachDiscard(this.observers.slice(), (observer) => this.runFailCause(e, observer)),
      ),
      Effect.flatMap(() => this.cleanup()),
    )
  }

  get end() {
    return pipe(
      Effect.suspendSucceed(() =>
        Effect.forEachDiscard(this.observers.slice(), (observer) => this.runEnd(observer)),
      ),
      Effect.flatMap(() => this.cleanup()),
    )
  }

  protected runEvent(a: A, observer: MulticastObserver<E, A>) {
    return pipe(
      observer.emitter.emit(a),
      Effect.onError((c) => this.runFailCause(c, observer)),
      Effect.provideEnvironment(observer.env),
    )
  }

  protected runFailCause(e: Cause.Cause<E>, observer: MulticastObserver<E, A>) {
    this.observers.splice(this.observers.indexOf(observer), 1)

    return pipe(
      observer.emitter.failCause(e),
      Effect.intoDeferred(observer.deferred),
      Effect.provideEnvironment(observer.env),
    )
  }

  protected runEnd(observer: MulticastObserver<E, A>) {
    this.observers.splice(this.observers.indexOf(observer), 1)

    return pipe(
      observer.emitter.end,
      Effect.intoDeferred(observer.deferred),
      Effect.provideEnvironment(observer.env),
    )
  }

  protected cleanup() {
    return this.fiber
      ? pipe(
          Fiber.interrupt(this.fiber),
          Effect.tap(() => Effect.sync(() => (this.fiber = undefined))),
        )
      : Effect.unit
  }
}
