import { Stream } from './Stream.js'

import { Cause } from '@/Cause/Cause.js'
import { Live } from '@/Fiber/Fiber.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import { Fx } from '@/Fx/Fx.js'
import { Runtime } from '@/Runtime/index.js'
import { wait } from '@/Scope/Closeable.js'

export function fromCallback<A, E = never>(
  f: <E2 = never>(cbs: {
    readonly event: (a: A) => Live<E | E2, unknown>
    readonly error: (cause: Cause<E>) => Live<E | E2, unknown>
    readonly end: () => Live<E | E2, unknown>
  }) => Finalizer,
): Stream<never, E, A> {
  return new FromCallback(f)
}

export class FromCallback<A, E> implements Stream<never, E, A> {
  constructor(
    readonly f: <E2 = never>(cbs: {
      readonly event: (a: A) => Live<E | E2, unknown>
      readonly error: (cause: Cause<E>) => Live<E | E2, unknown>
      readonly end: () => Live<E | E2, unknown>
    }) => Finalizer,
  ) {}

  readonly fork: Stream<never, E, A>['fork'] = (sink, context) => {
    const { f } = this

    return context.scheduler.asap(
      Fx(function* () {
        const runtime = Runtime(context)

        context.scope.ensuring(
          f({
            event: (a) => runtime.runFiber(sink.event(a)),
            error: (cause) => runtime.runFiber(sink.error(cause)),
            end: () => runtime.runFiber(sink.end),
          }),
        )

        yield* wait(context.scope)
      }),
      context,
    )
  }
}
