import { Stream } from './Stream.js'

import * as Fx from '@/Fx/Fx/index.js'
import * as Schedule from '@/Schedule/index.js'

export class FromFx<R, E, A> extends Stream<R, E, A> {
  constructor(readonly fx: Fx.Fx<R, E, A>) {
    super((sink, scheduler) =>
      scheduler.schedule(
        Fx.Fx(function* () {
          const value = yield* fx

          yield* sink.event(value)
          yield* sink.end
        }),
        Schedule.once,
      ),
    )
  }
}

export const fromFx = <R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> => new FromFx(fx)
