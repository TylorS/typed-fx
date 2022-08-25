import { flow, pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/Fx.js'

export function fromFx<R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> {
  return Stream((sink, scheduler, context) =>
    Fx.asks((env: Env<R>) =>
      scheduler.asap(
        pipe(
          fx,
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
