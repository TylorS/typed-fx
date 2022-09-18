import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/Fx.js'
import { span } from '@/Fx/logging.js'
import { Schedule } from '@/Schedule/Schedule.js'

export function scheduled(schedule: Schedule) {
  return <R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> =>
    Stream((sink, scheduler, context) =>
      Fx.asksEnv((env: Env<R>) =>
        scheduler.schedule(
          Fx.matchCause(sink.error, sink.event)(fx),
          env,
          schedule,
          context,
          span('Stream.scheduled'),
        ),
      ),
    )
}
