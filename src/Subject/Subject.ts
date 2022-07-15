import { interrupt } from '@/Exit/Exit'
import { SyntheticFiber } from '@/Fiber/Fiber'
import { FiberContext } from '@/FiberContext/index'
import { Fx, IO } from '@/Fx/Fx'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import { zipAll } from '@/Fx/index'
import { fromLazy, lazy } from '@/Fx/lazy'
import { withinContext } from '@/Fx/withinContext'
import { wait } from '@/Scope/wait'
import { Sink } from '@/Sink/Sink'
import { Stream } from '@/Stream/Stream'

export class Subject<R, E, A> extends Stream<R, E, A> implements Sink<E, A> {
  readonly observers: Set<readonly [Sink<E, A>, FiberContext]> = new Set()

  constructor() {
    super((sink, context) =>
      lazy(() => {
        const exit = wait<E, A>(context.scope)
        const { observers } = this

        return Fx(function* () {
          const observer = [sink, context] as const

          observers.add(observer)

          yield* context.scope.ensuring(fromLazy(() => observers.delete(observer)))

          return new SyntheticFiber(
            exit,
            Fx(function* () {
              const { fiberRefs } = yield* getFiberContext

              yield* fiberRefs.join(context.fiberRefs)
            }),
            (fiberId) =>
              Fx(function* () {
                yield* context.scope.close(interrupt(fiberId))

                return yield* exit
              }),
          )
        })
      }),
    )
  }

  readonly event: (a: A) => IO<E, unknown> = (a) =>
    zipAll(...Array.from(this.observers).map(([s, c]) => withinContext(c)(s.event(a))))

  readonly end: IO<E, unknown> = lazy(() =>
    zipAll(...Array.from(this.observers).map(([s, c]) => withinContext(c)(s.end))),
  )
}
