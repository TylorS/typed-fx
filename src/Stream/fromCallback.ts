import { Stream } from './Stream.js'

import { Cause } from '@/Cause/Cause.js'
import { Live } from '@/Fiber/Fiber.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import { Fx } from '@/Fx/Fx.js'
import { Runtime } from '@/Runtime/index.js'
import { wait } from '@/Scope/Closeable.js'

export function fromCallback<A, E = never>(
  f: <E2>(
    event: (a: A) => Live<E | E2, unknown>,
    error: (cause: Cause<E>) => Live<E | E2, unknown>,
    end: () => Live<E | E2, unknown>,
  ) => Finalizer,
): Stream<never, E, A> {
  return new FromCallback(f)
}

export class FromCallback<A, E> implements Stream<never, E, A> {
  constructor(
    readonly f: <E2>(
      event: (a: A) => Live<E | E2, unknown>,
      error: (cause: Cause<E>) => Live<E | E2, unknown>,
      end: () => Live<E | E2, unknown>,
    ) => Finalizer,
  ) {}

  readonly fork: Stream<never, E, A>['fork'] = (sink, context) => {
    const { f } = this

    return context.scheduler.asap(
      Fx(function* () {
        const runtime = Runtime(context)

        context.scope.ensuring(
          f(
            (a) => runtime.runFiber(sink.event(a)),
            (cause) => runtime.runFiber(sink.error(cause)),
            () => runtime.runFiber(sink.end),
          ),
        )

        yield* wait(context.scope)
      }),
      context,
    )
  }
}
