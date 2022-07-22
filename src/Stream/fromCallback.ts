import { Stream } from './Stream'

import { Exit } from '@/Exit/Exit'
import { FiberContext } from '@/FiberContext/index'
import { Fx } from '@/Fx/Fx'
import { toTask } from '@/Runtime/toTask'
import { once } from '@/Schedule/Schedule'
import { Finalizer } from '@/Scope/Finalizer'

export class FromCallback<R, E, A> extends Stream<R, E, A> {
  constructor(
    readonly register: (
      cb: (a: Fx<R, E, A>) => Promise<unknown>,
      close: (exit: Exit<E, unknown>) => Promise<unknown>,
      context: FiberContext,
    ) => Fx<R, E, Finalizer>,
  ) {
    super((sink, context) =>
      Fx(function* () {
        const cb = yield* toTask((fx: Fx<R, E, A>) =>
          Fx(function* () {
            return yield* sink.event(yield* fx)
          }),
        )
        const close = yield* toTask(context.scope.close)

        return yield* context.scheduler.schedule(
          Fx(function* () {
            context.scope.addFinalizer(yield* register(cb, close, context))
          }),
          once,
          context,
        )
      }),
    )
  }
}

export type CallbackRegister<R, E, A, R2 = R, E2 = E> = (
  cb: (a: Fx<R, E, A>) => Promise<unknown>,
  close: (exit: Exit<E, unknown>) => Promise<unknown>,
  context: FiberContext,
) => Fx<R2, E2, Finalizer>

export const fromCallback = <R, E, A, R2 = R, E2 = E>(
  register: CallbackRegister<R, E, A, R2, E2>,
): Stream<R | R2, E | E2, A> => new FromCallback<R | R2, E | E2, A>(register)
