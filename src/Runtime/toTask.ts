import { Exit } from '@/Exit/Exit'
import { Fiber } from '@/Fiber/Fiber'
import { Fx } from '@/Fx/Fx'
import { getRuntime } from '@/Runtime/Runtime'

export const toTaskFiber = <Args extends ReadonlyArray<any>, R, E, A>(
  f: (...args: Args) => Fx<R, E, A>,
): Fx<R, never, (...args: Args) => Fiber<E, A>> =>
  Fx(function* () {
    const runtime = yield* getRuntime<R>()

    return (...args: Args) => runtime.runFiber(f(...args))
  })

export const toTaskExit = <Args extends ReadonlyArray<any>, R, E, A>(
  f: (...args: Args) => Fx<R, E, A>,
): Fx<R, never, (...args: Args) => Promise<Exit<E, A>>> =>
  Fx(function* () {
    const runtime = yield* getRuntime<R>()

    return (...args: Args) => runtime.runExit(f(...args))
  })

export const toTask = <Args extends ReadonlyArray<any>, R, E, A>(
  f: (...args: Args) => Fx<R, E, A>,
): Fx<R, never, (...args: Args) => Promise<A>> =>
  Fx(function* () {
    const runtime = yield* getRuntime<R>()

    return (...args: Args) => runtime.run(f(...args))
  })
