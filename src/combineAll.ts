import { Cause, Effect, Fiber, Runtime } from "@typed/fx/externals"
import { Fx, Sink } from "@typed/fx/Fx"

export function combineAll<FX extends ReadonlyArray<Fx<any, any, any>>>(
  ...fx: FX
): Fx<
  Fx.ResourcesOf<FX[number]>,
  Fx.ErrorsOf<FX[number]>,
  {
    [k in keyof FX]: Fx.OutputOf<FX[k]>
  }
> {
  return Fx((sink) =>
    Effect.gen(function*($) {
      const length = fx.length
      const values = new Map<number, any>()
      const runFork = Runtime.runFork(yield* $(Effect.runtime<Fx.ResourcesOf<FX[number]>>()))

      const emitIfReady = Effect.suspend(() =>
        values.size === length ?
          sink.event(
            Array.from(values).sort((a, b) => a[0] - b[0]).map((x) => x[1]) as {
              [k in keyof FX]: Fx.OutputOf<FX[k]>
            }
          ) :
          Effect.unit()
      )

      const fibers = fx.map((f, i) =>
        runFork(
          f.run(Sink(
            (a) =>
              Effect.suspend(() => {
                values.set(i, a)

                return emitIfReady
              }),
            (cause) => Cause.isInterruptedOnly(cause) ? Effect.unit() : sink.error(cause)
          ))
        )
      )

      yield* $(
        Fiber.joinAll(fibers)
      )
    })
  )
}
