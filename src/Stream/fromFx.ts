import { isRight } from 'hkt-ts/Either'

import { Stream } from './Stream'

import { Fx } from '@/Fx/Fx'
import { fromExit, result } from '@/Fx/index'
import * as Schedule from '@/Schedule/Schedule'

export class FromFx<R, E, A> extends Stream<R, E, A> {
  constructor(readonly fx: Fx<R, E, A>) {
    super((sink, scheduler) =>
      scheduler.schedule(
        Fx(function* () {
          const exit = yield* result(fx)

          if (isRight(exit)) {
            yield* sink.event(exit.right)
            yield* sink.end
          } else {
            yield* sink.error(exit.left)
          }

          yield* fromExit(exit)
        }),
        Schedule.once,
      ),
    )
  }
}

export const fromFx = <R, E, A>(fx: Fx<R, E, A>): Stream<R, E, A> => new FromFx(fx)
