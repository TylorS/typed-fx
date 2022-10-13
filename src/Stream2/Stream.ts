import { pipe } from 'hkt-ts'

import { Fiber } from '@/Fiber/Fiber.js'
import * as Fx from '@/Fx/index.js'
import { unit } from '@/Fx/index.js'
import { Drain, Sink } from '@/Sink2/Sink.js'

export interface Stream<R, E, A> {
  readonly fork: <R2, E2, B>(sink: Sink<E, A, R2, E2, B>) => Fx.RIO<R | R2, Fiber<E2, B>>
}

export function fromFx<R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> {
  return {
    fork: (sink) =>
      pipe(
        fx,
        Fx.matchCause(sink.error, (a) =>
          pipe(
            sink.event(a),
            Fx.flatMap(() => sink.end),
          ),
        ),
        Fx.fork,
      ),
  }
}

export function drain<R, E, A>(stream: Stream<R, E, A>): Fx.RIO<R, Fiber<E, void>> {
  return stream.fork(new Drain<E, A, never, never, void>(unit))
}
