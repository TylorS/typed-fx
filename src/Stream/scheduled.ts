import { pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/Fx.js'
import { Schedule } from '@/Schedule/Schedule.js'

export function scheduled(schedule: Schedule) {
  return <R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> =>
    Stream<R, E, A>((sink, scheduler, context) =>
      Fx.asksEnv((env: Env<R>) =>
        scheduler.schedule(pipe(fx, Fx.flatMap(sink.event)), schedule, env, context),
      ),
    )
}
