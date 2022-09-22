import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { access, fromLazy } from '@/Fx/index.js'
import { delayed } from '@/Schedule/Schedule.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'
import { Delay } from '@/Time/index.js'

export function delay(delay: Delay) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> =>
    Stream((sink, scheduler, context) =>
      access((env: Env<R>) =>
        stream.fork(new DelaySink(sink, scheduler, context, env, delay), scheduler, context),
      ),
    )
}

class DelaySink<E, A, E2> implements Sink<E, A, E2> {
  constructor(
    readonly sink: Sink<E, A, E2>,
    readonly scheduler: Scheduler,
    readonly context: FiberContext<FiberId.Live>,
    readonly env: Env<any>,
    readonly delay: Delay,
  ) {}

  event(value: A) {
    return fromLazy(() =>
      this.scheduler.schedule(
        this.sink.event(value),
        this.env,
        delayed(this.delay),
        this.context.fork(),
      ),
    )
  }

  error = this.sink.error
  end = this.sink.end
}
