import { pipe } from 'hkt-ts'
import { makeAssociative } from 'hkt-ts/Array'
import { Right, isLeft, map } from 'hkt-ts/Either'

import { AnyFx, ErrorsOf, Fx, OutputOf, ResourcesOf } from './Fx'
import { async } from './InstructionSet/Async'
import { fromExit } from './InstructionSet/FromExit'

import { Exit, makeParallelAssociative } from '@/Exit/Exit'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime'
import { getRuntime } from '@/Runtime/Runtime'

const { concat: concatExitPar } = makeParallelAssociative<any, any>(makeAssociative())

export const tuple = <FX extends ReadonlyArray<AnyFx>>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ...fx: FX
): Fx<
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  { readonly [K in keyof FX]: OutputOf<FX[K]> }
> =>
  // eslint-disable-next-line require-yield
  Fx(function* () {
    if (fx.length === 0) {
      return []
    }

    const runtime = yield* getRuntime<ResourcesOf<FX[number]>>()

    return yield* async<never, any, any>((cb) => {
      const runtimes: Array<FiberRuntime<any, any, any>> = Array(fx.length)
      const exits: Array<Exit<any, any>> = Array(fx.length)

      let remaining = fx.length
      let exited = false

      const finalizer = Fx(function* () {
        for (const r of runtimes) {
          yield* r.interrupt(r.scope.fiberId)
        }
      })

      function finish(exit: Exit<any, any>, index: number) {
        exits[index] = pipe(
          exit,
          map((x) => [x]),
        )

        if (isLeft(exit)) {
          exited = true

          cb(
            Fx(function* () {
              yield* finalizer

              return yield* fromExit(exit)
            }),
          )
        }

        if (--remaining === 0 && !exited) {
          cb(fromExit(exits.reduce(concatExitPar)))
        }
      }

      for (let i = 0; i < fx.length; ++i) {
        const f = fx[i]
        const fiberRuntime = runtime.makeFiberRuntime(f as any)

        runtimes.push(fiberRuntime)
        fiberRuntime.addObserver((exit) => finish(exit, i))
      }

      runtimes.forEach((r) => r.start())

      return Right(finalizer)
    })
  })
