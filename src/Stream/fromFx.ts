import { Stream } from './Stream'

import { Fx } from '@/Fx/Fx'
import * as Schedule from '@/Schedule/Schedule'

export class FromFx<R, E, A> extends Stream<R, E, A> {
  constructor(readonly fx: Fx<R, E, A>) {
    super((sink, context) =>
      context.scheduler.schedule(
        Fx(function* () {
          const value = yield* fx

          yield* sink.event(value)
          yield* sink.end
        }),
        Schedule.once,
        context,
      ),
    )
  }
}

export const fromFx = <R, E, A>(fx: Fx<R, E, A>): Stream<R, E, A> => new FromFx(fx)
