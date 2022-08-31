import { Maybe, pipe } from 'hkt-ts'
import { BRAND } from 'hkt-ts/Branded'
import { Just } from 'hkt-ts/Maybe'
import { Second } from 'hkt-ts/Typeclass/Associative'

import * as Fx from './Fx.js'

import { IORef, IORefs } from '@/IO/IORefs.js'

export class FiberRef<R, E, A> extends IORef<E, A> implements Fx.FxBranded<R, IORef<E, A>> {
  readonly [BRAND]!: (_: Fx.FxBrand<R>) => void

  constructor(
    readonly initial: Fx.Fx<R, E, A>,
    readonly fork: IORef<E, A>['fork'] = Just,
    readonly join: IORef<E, A>['join'] = Second.concat,
  ) {
    super(initial, fork, join)
  }
}

export function fiberRefLocally<R2, E2, B>(fiberRef: FiberRef<R2, E2, B>, value: B) {
  return <R, E, A>(fx: Fx.Fx<R, E, A>): Fx.Fx<R, E, A> =>
    pipe(
      Fx.getIORefs,
      Fx.flatMap((ioRefs) =>
        pipe(
          Fx.fromLazy(() => IORefs.pushLocal(ioRefs, fiberRef, value)),
          Fx.flatMap(() =>
            pipe(
              fx,
              Fx.attempt((exit) =>
                pipe(
                  Fx.fromLazy(() => IORefs.popLocal(ioRefs, fiberRef)),
                  Fx.flatMap(() => Fx.fromExit(exit)),
                ),
              ),
            ),
          ),
        ),
      ),
    )
}

// TODO: Handle memoizing FiberRef initialization

export function getFiberRef<R, E, A>(fiberRef: FiberRef<R, E, A>): Fx.Fx<R, E, A> {
  return pipe(
    Fx.getIORefs,
    Fx.flatMap((ioRefs) =>
      pipe(
        ioRefs.locals.get().get(fiberRef),
        Maybe.match(
          () =>
            pipe(
              fiberRef.initial,
              Fx.tapFx((a) => Fx.fromLazy(() => IORefs.set(ioRefs, fiberRef, a))),
            ),
          (stack) => Fx.now(stack.value as A) as Fx.Fx<R, E, A>,
        ),
      ),
    ),
  )
}
