import { isRight } from 'hkt-ts/Either'

import { Stream } from './Stream.js'

import { Cause } from '@/Cause/Cause.js'
import { Exit } from '@/Exit/Exit.js'
import { Finalizer } from '@/Finalizer/Finalizer.js'
import { Fx } from '@/Fx/Fx.js'
import { Runtime } from '@/Runtime/index.js'
import { wait } from '@/Scope/Closeable.js'

export function fromCallback<A, E>(
  f: (
    event: (a: A) => Promise<unknown>,
    error: (cause: Cause<E>) => Promise<unknown>,
    end: () => Promise<unknown>,
  ) => Finalizer,
) {
  return new FromCallback(f)
}

export class FromCallback<A, E> implements Stream<never, E, A> {
  constructor(
    readonly f: (
      event: (a: A) => Promise<unknown>,
      error: (cause: Cause<E>) => Promise<unknown>,
      end: () => Promise<unknown>,
    ) => Finalizer,
  ) {}

  readonly fork: Stream<never, E, A>['fork'] = (sink, context) => {
    const { f } = this

    return context.scheduler.asap(
      Fx(function* () {
        const runtime = Runtime(context)

        const onExit = <E, A>(exit: Exit<E, A>) => {
          if (isRight(exit)) {
            return exit.right
          }

          return runtime.run(context.scope.close(exit))
        }

        context.scope.ensuring(
          f(
            (a) => runtime.runExit(sink.event(a)).then(onExit),
            (cause) => runtime.runExit(sink.error(cause)).then(onExit),
            () => runtime.runExit(sink.end).then(onExit),
          ),
        )

        yield* wait(context.scope)
      }),
      context,
    )
  }
}
