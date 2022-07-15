import { Either, pipe } from 'hkt-ts'
import { isLeft } from 'hkt-ts/Either'
import { First } from 'hkt-ts/Typeclass/Associative'

import { GetCurrentFiberContext } from '../RuntimeInstruction'
import { RuntimeIterable } from '../RuntimeIterable'

import { forkFiberRuntime } from './Fork'

import * as Exit from '@/Exit/index'
import { pending } from '@/Future/Future'
import { complete } from '@/Future/complete'
import { wait } from '@/Future/wait'
import { AnyFx, Fx, OutputOf } from '@/Fx/Fx'
import { fromExit, success } from '@/Fx/InstructionSet/FromExit'
import { ZipAll } from '@/Fx/InstructionSet/ZipAll'

const concatExitPar = Exit.makeParallelAssociative<any, any>(First).concat

export function* processZipAll<FX extends ReadonlyArray<AnyFx>, R, E>(
  instr: ZipAll<FX>,
  toRuntimeIterable: <A>(fx: Fx<R, E, A>) => RuntimeIterable<E, A>,
): RuntimeIterable<E, { readonly [K in keyof FX]: OutputOf<FX[K]> }> {
  const fxs = instr.input

  if (fxs.length === 0) {
    return [] as any
  }

  const runtimes = []
  const [future, onExit] = zipAllFuture(fxs.length)

  for (let i = 0; i < fxs.length; ++i) {
    const runtime = yield* forkFiberRuntime(fxs[i], {}, toRuntimeIterable)

    runtime.addObserver((exit) => onExit(exit, i))
    runtimes.push(runtime)
    runtime.start()
  }

  const exit = yield* toRuntimeIterable(wait(future))

  if (isLeft(exit)) {
    const context = yield new GetCurrentFiberContext()

    yield* processZipAll(
      new ZipAll(
        runtimes
          .filter((r) => r.context.status.tag !== 'Exited')
          .map((r) => r.interrupt(context.fiberId)),
      ),
      toRuntimeIterable,
    )
  }

  return yield* toRuntimeIterable(fromExit(exit)) as any
}

function zipAllFuture(expected: number) {
  const future = pending<Exit.Exit<any, ReadonlyArray<any>>>()
  const exits = Array<Exit.Exit<any, ReadonlyArray<any>>>(expected)

  function onExit(exit: Exit.Exit<any, any>, index: number) {
    exits[index] = pipe(
      exit,
      Either.map((x) => [x]),
    )

    if (--expected === 0) {
      complete(success(exits.reduce(concatExitPar)))(future)
    }
  }

  return [future, onExit] as const
}
