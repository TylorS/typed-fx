import { pipe } from 'hkt-ts'
import { Right } from 'hkt-ts/Either'

// eslint-disable-next-line import/no-cycle
import type { FiberRuntime } from './FiberRuntime'
import { FiberRuntimeParams } from './FiberRuntimeParams'
import { PopTrace, PushTrace, YieldNow } from './RuntimeInstruction'
import { RuntimeIterable } from './RuntimeIterable'
import { processAccess } from './processors/Access'
import { processAsync } from './processors/Async'
// eslint-disable-next-line import/no-cycle
import { processFork } from './processors/Fork'
import { processFromExit } from './processors/FromExit'
import { processGetFiberContext } from './processors/GetFiberContext'
import { processProvide } from './processors/Provide'
import { processSetInterruptible } from './processors/SetInterruptible'
import { processWithConcurrency } from './processors/WithConcurrency'
// eslint-disable-next-line import/no-cycle
import { processZipAll } from './processors/ZipAll'

import { Exit, die } from '@/Exit/Exit'
import { pending } from '@/Future/Future'
import { complete } from '@/Future/complete'
import { wait } from '@/Future/wait'
import { Fx } from '@/Fx/Fx'
import { Access } from '@/Fx/InstructionSet/Access'
import { Async } from '@/Fx/InstructionSet/Async'
import { Fork } from '@/Fx/InstructionSet/Fork'
import { FromExit } from '@/Fx/InstructionSet/FromExit'
import { GetFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import { Instruction } from '@/Fx/InstructionSet/Instruction'
import { Provide } from '@/Fx/InstructionSet/Provide'
import { SetInterruptible } from '@/Fx/InstructionSet/SetInterruptable'
import { WithConcurrency } from '@/Fx/InstructionSet/WithConcurrency'
import { ZipAll } from '@/Fx/InstructionSet/ZipAll'
import { fromLazy, success } from '@/Fx/index'

/**
 * An InstructionProcessor is responsible for converting Fx's instruction set into the FiberRuntime's instruction set.
 * It communicates the lifecycle of the Fiber to its Supervisor. The only state in which it keeps is the total
 * number of instructions processed, once reached it will yield to other Fibers cooperatively to ensure it is not
 * hogging up the thread.
 */
export class InstructionProcessor<R, E, A> implements RuntimeIterable<E, Exit<E, A>> {
  protected _instructionCount = 0

  readonly run: <A2>(fx: Fx<R, E, A2>) => RuntimeIterable<E, A2>
  readonly close: (exit: Exit<E, A>) => RuntimeIterable<E, Exit<E, A>>

  constructor(
    readonly runtime: FiberRuntime<R, E, A>,
    readonly fx: Fx<R, E, A>,
    readonly params: FiberRuntimeParams<R>,
  ) {
    this.run = this.runFx.bind(this)
    this.close = this.release.bind(this)
  }

  *[Symbol.iterator]() {
    try {
      this.params.supervisor.onStart(this.runtime, this.fx, this.params.parent)

      const value = yield* this.runFx(this.fx)
      const exit = yield* this.release(Right(value))

      this.params.supervisor.onEnd(this.runtime, exit)

      return exit
    } catch (e) {
      const exit = yield* this.release(die(e))

      this.params.supervisor.onEnd(this.runtime, exit)

      return exit
    }
  }

  protected *runFx<A2>(fx: Fx<R, E, A2>): RuntimeIterable<E, A2> {
    const generator = fx[Symbol.iterator]() as Generator<Instruction<R, E, any>, A2>
    const maxInstructionCount = this.params.platform.maxInstructionCount
    let result = generator.next()

    while (!result.done) {
      const instr = result.value

      if (instr.trace) {
        yield new PushTrace(instr.trace)
      }

      this.params.supervisor.onInstruction(this.runtime, instr)

      try {
        result = generator.next(yield* this.processInstruction(instr))
      } catch (e) {
        result = generator.throw(e)
      }

      // Suspend to other fibers running
      if (++this._instructionCount > maxInstructionCount) {
        this._instructionCount = 0 // Reset the count

        this.params.supervisor.onSuspend(this.runtime)

        yield new YieldNow() // Yield to other fibers cooperatively

        this.params.supervisor.onRunning(this.runtime)
      }
    }

    // Clean up any traces we added to the Stack that no longer need to be there
    yield new PopTrace()

    return result.value
  }

  protected *processInstruction(instr: Instruction<R, E, any>): RuntimeIterable<E, any> {
    if (instr.is<typeof FromExit<E, any>>(FromExit)) {
      return yield* processFromExit(instr)
    }

    if (instr.is<typeof Async<R, E, any>>(Async)) {
      this.params.supervisor.onSuspend(this.runtime)
      const x = yield* processAsync(instr, this.run)
      this.params.supervisor.onRunning(this.runtime)

      return x
    }

    if (instr.is<typeof Access<R, R, E, any>>(Access)) {
      return yield* processAccess(instr, this.run)
    }

    if (instr.is<typeof Provide<R, E, any>>(Provide)) {
      return yield* processProvide(instr, this.run)
    }

    if (instr.is(GetFiberContext)) {
      return yield* processGetFiberContext(instr)
    }

    if (instr.is(SetInterruptible)) {
      return yield* processSetInterruptible(instr, this.run)
    }

    if (instr.is(WithConcurrency)) {
      return yield* processWithConcurrency(instr, this.run)
    }

    if (instr.is(ZipAll)) {
      return yield* processZipAll(instr, this.run)
    }

    if (instr.is(Fork)) {
      return yield* processFork(instr, this.run)
    }

    throw new Error(`Unknown Instruction ecountered: ${JSON.stringify(instr, null, 2)}`)
  }

  protected *release(exit: Exit<E, A>): RuntimeIterable<E, Exit<E, A>> {
    const { scope } = this.params

    const released = yield* this.runFx(scope.close(exit))

    // If we were able to release go ahead and
    if (released) {
      return exit
    }

    const future = pending<Exit<E, A>>()

    // Wait for the Scope to close
    yield* this.runFx(
      scope.addFinalizer((exit) => fromLazy(() => pipe(exit, success, complete(future)))),
    )

    return yield* this.runFx(wait(future))
  }
}
