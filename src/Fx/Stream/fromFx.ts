import { isLeft } from 'hkt-ts/Either'

import { Fx, attempt } from '../Fx/Fx.js'

import { Stream } from './Stream.js'

import { once } from '@/Schedule/Schedule.js'

export function fromFx<R, E, A>(fx: Fx<R, E, A>) {
  return new FromFx(fx)
}

export class FromFx<R, E, A> extends Stream<R, E, A> {
  constructor(readonly fx: Fx<R, E, A>) {
    super((sink, scope) =>
      scope.scheduler.schedule(
        Fx(function* () {
          const exit = yield* attempt(fx)

          if (isLeft(exit)) {
            yield* sink.error(exit.left)
          } else {
            yield* sink.event(exit.right)
            yield* sink.end
          }
        }),
        once,
      ),
    )
  }
}
