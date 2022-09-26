import { pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import { Cause } from '@/Cause/Cause.js'
import * as Fx from '@/Fx/Fx.js'
import * as Semaphore from '@/Semaphore/index.js'
import { Sink } from '@/Sink/Sink.js'
import { onEnd } from '@/Sink/onEnd.js'
import { onError } from '@/Sink/onError.js'

export function acquirePermit(semaphore: Semaphore.Semaphore) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> =>
    new AcquirePermitStream(stream, semaphore)
}

export class AcquirePermitStream<R, E, A> implements Stream<R, E, A> {
  constructor(readonly stream: Stream<R, E, A>, readonly semaphore: Semaphore.Semaphore) {}

  fork = <E2>(sink: Sink<E, A, E2>) =>
    pipe(
      this.semaphore.prepare,
      Fx.flatMap(({ acquire, release }) =>
        pipe(
          acquire,
          Fx.uninterruptable,
          Fx.flatMap(() =>
            this.stream.fork(
              pipe(
                sink,
                onError((cause: Cause<E>) =>
                  pipe(
                    release,
                    Fx.flatMap(() => sink.error(cause)),
                  ),
                ),
                onEnd(
                  pipe(
                    release,
                    Fx.flatMap(() => sink.end),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    )
}
