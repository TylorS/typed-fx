import { Stream } from './Stream.js'

import { Fiber, Synthetic, inheritFiberRefs } from '@/Fiber/Fiber.js'
import { Pending, complete, wait } from '@/Future/index.js'
import * as Fx from '@/Fx/index.js'
import { Sink } from '@/Sink/index.js'

export function flatMap<A, R2, E2, B>(f: (a: A) => Stream<R2, E2, B>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Stream<R | R2, E, B, E1 | E2> =>
    new FlatMapStream(stream, f)
}

export class FlatMapStream<R, E, A, E1, R2, E2, B> implements Stream<R | R2, E, B, E1 | E2> {
  constructor(readonly stream: Stream<R, E, A, E1>, readonly f: (a: A) => Stream<R2, E2, B>) {}

  readonly fork: Stream<R | R2, E, B, E1 | E2>['fork'] = <R3, E3, C>(sink: Sink<E, B, R3, E3, C>) =>
    Fx.lazy(() => {
      const s = new FlatMapSink(sink, this.f)
      const fork = this.stream.fork(s)

      return Fx.Fx(function* () {
        const env = yield* Fx.getEnv<R | R2 | R3>()
        const forked = yield* fork
        const fiber: Fiber<E1 | E2 | E3, C> = Synthetic({
          id: forked.id,
          exit: Fx.provide(env)(Fx.attempt(wait(s.future))),
          inheritFiberRefs: inheritFiberRefs(forked),
          interruptAs: forked.interruptAs,
        })

        return fiber
      })
    })
}

export class FlatMapSink<E, A, R2, E2, B, R3, E3, C> implements Sink<E, A, R2 | R3, E2 | E3, B> {
  protected running = 0
  protected ended = false

  readonly future = Pending<R2 | R3, E2 | E3, B>()

  constructor(readonly sink: Sink<E, C, R2, E2, B>, readonly f: (a: A) => Stream<R3, E3, C>) {}

  readonly event: Sink<E, A, R2 | R3, E2 | E3, B>['event'] = (a) =>
    Fx.lazy(() =>
      this.f(a).fork<R2 | R3, E2 | E3, unknown>({
        event: this.sink.event,
        error: (e) => {
          complete(this.future)(Fx.fromCause(e))

          return wait(this.future)
        },
        end: Fx.lazy(() => {
          this.running--
          this.endIfCompleted()

          return Fx.unit
        }),
      }),
    )

  readonly error: Sink<E, A, R2 | R3, E2 | E3, B>['error'] = (e) =>
    Fx.lazy(() => {
      this.ended = true

      complete(this.future)(this.sink.error(e))

      return wait(this.future)
    })

  readonly end: Sink<E, A, R2 | R3, E2 | E3, B>['end'] = Fx.lazy(() => {
    this.ended = true

    this.endIfCompleted()

    return wait(this.future)
  })

  protected endIfCompleted() {
    if (this.ended && this.running === 0) {
      complete(this.future)(this.sink.end)
    }
  }
}
