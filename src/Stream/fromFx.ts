import { Stream } from './Stream.js'

import * as Fx from '@/Fx/index.js'

export class FromFx<R, E, A> extends Stream<R, E, A> {
  constructor(readonly fx: Fx.Fx<R, E, A>) {
    super((sink, context) => {
      return context.scheduler.asap(
        Fx.Fx(function* () {
          yield* sink.event(yield* fx)
          yield* sink.end
        }),
        context,
      )
    })
  }
}

export const fromFx = <R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> => new FromFx(fx)
