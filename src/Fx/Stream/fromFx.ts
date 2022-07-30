import { isLeft } from 'hkt-ts/Either'
import { flow } from 'hkt-ts/function'

import * as Fx from '../Fx/Fx.js'

import { Stream } from './Stream.js'

import { once } from '@/Schedule/Schedule.js'

export function fromFx<R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> {
  return new FromFx(fx)
}

export class FromFx<R, E, A> extends Stream<R, E, A> {
  constructor(readonly fx: Fx.Fx<R, E, A>) {
    super((sink, context) =>
      context.scheduler.schedule(
        Fx.Fx(function* () {
          const exit = yield* Fx.attempt(fx)

          if (isLeft(exit)) {
            yield* sink.error(exit.left)
          } else {
            yield* sink.event(exit.right)
            yield* sink.end
          }
        }, 'Stream.fromFx'),
        once,
      ),
    )
  }
}

export const died = flow(Fx.died, fromFx)
export const fail = flow(Fx.fail, fromFx)
export const failure = flow(Fx.failure, fromFx)
export const success = flow(Fx.success, fromFx)
export const fromLazy = flow(Fx.fromLazy, fromFx)
export const unit = fromFx(Fx.unit)
