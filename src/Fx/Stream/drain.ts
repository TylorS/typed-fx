import { pipe } from 'hkt-ts'
import { isLeft } from 'hkt-ts/Either'

import { Fiber } from '../Fiber/Fiber.js'
import { forkFiberContext } from '../FiberRuntime/fxInstructionToRuntimeInstruction.js'
import { getFiberScope } from '../Fx/Instruction/GetFiberScope.js'
import * as Fx from '../Fx/index.js'
import { attempt, getFiberContext } from '../Fx/index.js'
import { Drain } from '../Sink/Drain.js'
import { Sink } from '../Sink/Sink.js'
import { make } from '../Sink/make.js'

import { Stream, StreamContext } from './Stream.js'

export const forkStreamContext = (__trace?: string) =>
  Fx.Fx(function* () {
    yield* Fx.addCustomTrace(__trace)

    const context = yield* getFiberContext()
    const scope = yield* getFiberScope()
    const streamContext: StreamContext = {
      ...forkFiberContext(context),
      scope: scope.fork(),
    }

    return streamContext
  })

export function drain<R, E, A>(stream: Stream<R, E, A>, __trace?: string): Fx.RIO<R, Fiber<E, A>> {
  return Fx.Fx(function* () {
    yield* Fx.addCustomTrace(__trace)

    const context = yield* forkStreamContext()

    return yield* pipe(stream, subscribe(new Drain(context.scope), context))
  })
}

export const observe =
  <A, R2, E2>(f: (a: A) => Fx.Fx<R2, E2, any>) =>
  <R, E>(stream: Stream<R, E, A>): Fx.Fx<R | R2, never, Fiber<E | E2, unknown>> =>
    Fx.Fx(function* () {
      const context = yield* forkStreamContext()
      const drain = new Drain<E | E2, A>(context.scope)
      const sink = yield* make<R2, E, A>(
        (a) =>
          Fx.Fx(function* () {
            const exit = yield* attempt(f(a))

            if (isLeft(exit)) {
              yield* drain.error(exit.left)
            }
          }),
        drain.error,
        drain.end,
      )

      return yield* pipe(stream, subscribe(sink, context))
    })

export const subscribe =
  <E, A>(sink: Sink<E, A>, context?: StreamContext, __trace?: string) =>
  <R>(stream: Stream<R, E, A>) =>
    Fx.Fx(function* () {
      yield* Fx.addCustomTrace(__trace)

      const ctx = context ?? (yield* forkStreamContext())

      return yield* stream.fork(sink, {
        ...ctx,
        scope: ctx.scope.fork(),
      })
    })
