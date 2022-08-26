import { flow, pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/Fx.js'

export function fromFx<R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> {
  return Stream((sink, scheduler, context) =>
    Fx.asksEnv((env: Env<R>) =>
      scheduler.asap(
        pipe(
          fx,
          Fx.tap(console.log),
          Fx.matchCause(
            sink.error,
            flow(
              sink.event,
              Fx.flatMap(() => sink.end),
            ),
          ),
        ),
        env,
        context,
      ),
    ),
  )
}
