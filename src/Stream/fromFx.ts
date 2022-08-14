import { Stream } from './Stream.js'

import * as Fx from '@/Fx/index.js'

export class FromFx<R, E, A> implements Stream<R, E, A> {
  constructor(readonly fx: Fx.Fx<R, E, A>) {}

  readonly fork: Stream<R, E, A>['fork'] = (sink, context) => {
    const { fx } = this

    return context.scheduler.asap(
      Fx.Fx(function* () {
        const a = yield* fx

        yield* sink.event(a)
        yield* sink.end
      }),
      context,
    )
  }
}

export const fromFx = <R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> => new FromFx(fx)
