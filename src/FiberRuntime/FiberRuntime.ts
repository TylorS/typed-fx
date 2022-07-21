import * as Either from 'hkt-ts/Either'
import { Strict } from 'hkt-ts/Typeclass/Eq'
import { pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberRuntimeParams } from './FiberRuntimeParams'
import { InstructionProcessor } from './InstructionProcessor'
import { RuntimeInstruction, YieldNow } from './RuntimeInstruction'
import { SuspendMap } from './SuspendMap'

import { Atomic } from '@/Atomic/Atomic'
import { Traced } from '@/Cause/Cause'
import { Env } from '@/Env/Env'
import { Exit, interrupt } from '@/Exit/Exit'
import { Fiber } from '@/Fiber/Fiber'
import { FiberContext } from '@/FiberContext/index'
import { FiberId } from '@/FiberId/FiberId'
import { FiberStatus } from '@/FiberStatus/FiberStatus'
import { Future, pending } from '@/Future/Future'
import { complete } from '@/Future/complete'
import { wait } from '@/Future/wait'
import { Fx, Of } from '@/Fx/Fx'
import { success } from '@/Fx/InstructionSet/FromExit'
import { Semaphore } from '@/Semaphore/Semaphore'
import { Stack } from '@/Stack/index'
import { StackTrace, captureTrace } from '@/StackTrace/StackTrace'
import { Delay } from '@/Timer/Timer'
import { EmptyTrace, StackFrameTrace, Trace } from '@/Trace/Trace'

/**
 * The FiberRuntime is the stateful portion of a Fiber. It understands how to process RuntimeInstructions
 * to keep all of the state necessary to create a LiveFiber.
 */
export class FiberRuntime<R, E, A> {
  protected _children = new Map<FiberId, Fiber.Live<any, any>>()
  protected _concurrencyLevel: Stack<Semaphore> = new Stack(
    new Semaphore(this.params.platform.maxConcurrency),
  )
  protected _environment: Stack<Env<any>> = new Stack(this.params.env)
  protected _fiberStatus: Atomic<FiberStatus<E, A>>
  protected _generator: Generator<RuntimeInstruction<E>, any, any>
  protected _instructionProcessor: InstructionProcessor<R, E, A>
  protected _interruptedBy: Array<FiberId> = []
  protected _interruptStatus: Stack<boolean> = new Stack(true)
  protected _stackTrace = new StackTrace(this.params.fiberId, new Stack<Trace>(EmptyTrace))
  protected _suspended = new SuspendMap<E>()
  protected _timerHandle: (() => void) | null = null
  protected _instructionCount = 0
  protected _shouldBreak = false

  get context(): FiberContext {
    return this.getFiberContext()
  }

  get status(): FiberStatus<E, A> {
    return this._fiberStatus.get
  }

  get interruptStatus(): boolean {
    return this._interruptStatus.value
  }

  get concurrencyLevel(): NonNegativeInteger {
    return this._concurrencyLevel.value.maxPermits
  }

  get stackTrace(): StackTrace {
    return this._stackTrace
  }

  get children(): ReadonlySet<Fiber.Live<any, any>> {
    return new Set(this._children.values())
  }

  readonly exit: Future<never, never, Exit<E, A>> = pending()

  constructor(readonly fx: Fx<R, E, A>, readonly params: FiberRuntimeParams<R>) {
    this._fiberStatus = new Atomic<FiberStatus<E, A>>(
      new FiberStatus.Suspended(this.params.fiberId, new Set()),
      Strict,
    )

    this._instructionProcessor = new InstructionProcessor(fx, params.scope, () => this.context)
    this._generator = this._instructionProcessor[Symbol.iterator]()
    this.params.supervisor.onStart(this, fx, params.parent)
  }

  readonly start = (value?: any): void => {
    this._timerHandle = null
    let result = this._generator.next(value)

    while (!result.done && !this._shouldBreak) {
      const either = this.processInstruction(result.value)

      if (Either.isLeft(either)) {
        if (either.left) {
          return this.start()
        }

        return
      }

      result = this._generator.next(either.right)
    }

    this._shouldBreak = false
  }

  readonly startLater = () => {
    this._timerHandle = this.params.scheduler.setTimer(this.start, Delay(0))
  }

  readonly addObserver = (observer: FiberStatus.Observer<E, A>) => {
    this._fiberStatus.update(FiberStatus.addObserver(observer))

    return () => this._fiberStatus.update(FiberStatus.removeObserver(observer))
  }

  readonly interrupt = (fiberId: FiberId): Of<Exit<E, A>> => {
    this._interruptedBy.push(fiberId)

    if (this._interruptStatus.value) {
      this.interruptNow(interrupt(fiberId))
      this.start()
    }

    return wait(this.exit)
  }

  protected interruptNow(exit: Exit<E, A>) {
    this._shouldBreak = true
    this._timerHandle?.()
    this._generator = this._instructionProcessor.close(exit)[Symbol.iterator]() // Push in an Interrupt to close the Scope
  }

  protected processInstruction(instr: RuntimeInstruction<E>): Either.Either<boolean, any> {
    switch (instr.tag) {
      case 'Done': {
        this.finalize(instr.exit)

        return Either.Left(false)
      }
      case 'OnInstruction': {
        const fxInstr = instr.instruction

        if (++this._instructionCount === this.params.platform.maxInstructionCount) {
          this._instructionCount = 0

          return this.processInstruction(new YieldNow())
        }

        return Either.Right(this.params.supervisor.onInstruction(this, fxInstr as any))
      }
      case 'Fail': {
        this.interruptNow(Either.Left(instr.cause))

        return Either.Left(true)
      }
      case 'GetConcurrencyLevel':
        return Either.Right(this.concurrencyLevel)
      case 'GetCurrentFiberContext':
        return Either.Right(this.getFiberContext())
      case 'GetEnvironment':
        return Either.Right(this._environment.value)
      case 'GetInterruptStatus':
        return Either.Right(this.interruptStatus)
      case 'GetTrace':
        return Either.Right(this.stackTrace.flatten())
      case 'PopConcurrencyLevel': {
        this._concurrencyLevel = this._concurrencyLevel.pop() || this._concurrencyLevel
        return Either.Right(undefined)
      }
      case 'PopEnvironment': {
        this._environment = this._environment.pop() || this._environment
        return Either.Right(undefined)
      }
      case 'PopInterruptStatus': {
        this._interruptStatus = this._interruptStatus.pop() || this._interruptStatus

        // If things are interruptable again, lets go ahead and kill
        if (this._interruptedBy.length > 0 && this._interruptStatus.value) {
          this.interruptNow(interrupt(this._interruptedBy[0]))

          return Either.Left(true)
        }

        return Either.Right(undefined)
      }
      case 'PopTrace': {
        this._stackTrace = this._stackTrace.pop() || this._stackTrace
        return Either.Right(undefined)
      }
      case 'PushConcurrencyLevel': {
        this._concurrencyLevel = this._concurrencyLevel.push(new Semaphore(instr.concurrencyLevel))
        return Either.Right(undefined)
      }
      case 'PushEnvironment': {
        this._environment = this._environment.push(instr.env)
        return Either.Right(undefined)
      }
      case 'PushInterruptStatus': {
        this._interruptStatus = this._interruptStatus.push(instr.interruptStatus)
        return Either.Right(undefined)
      }
      case 'PushTrace': {
        this._stackTrace = this._stackTrace.push(parseCustomTrace(instr.trace))
        return Either.Right(undefined)
      }
      case 'Suspend': {
        this.params.supervisor.onSuspend(this)
        this._stackTrace = this._stackTrace.push(captureTrace())

        return Either.Right(this._suspended.suspend())
      }
      case 'Resume': {
        return Either.Left(
          this._suspended.resume(instr.id, (exit) => {
            if (Either.isLeft(exit)) {
              this.interruptNow(exit)
              this.start()
            } else {
              this.start(exit.right)
            }
          }),
        )
      }
      case 'YieldNow': {
        this._stackTrace = this._stackTrace.push(captureTrace())

        return Either.Left(false)
      }
    }

    throw new Error(`Unknown Runtime Instruction encountered: ${JSON.stringify(instr)}`)
  }

  protected finalize = (exit: Exit<E, A>) => {
    const currentStatus = this._fiberStatus.getAndSet(
      new FiberStatus.Exited(
        this.params.fiberId,
        pipe(
          exit,
          Either.mapLeft((cause) => new Traced(cause, this.stackTrace.flatten())),
        ),
      ),
    )

    if (currentStatus.tag !== 'Exited') {
      currentStatus.observers.forEach((o) => o(exit))
      complete(this.exit)(success(exit))
      this.params.supervisor.onEnd(this, exit)
    }
  }

  protected getFiberContext = (): FiberContext =>
    new FiberContext(
      this.params.fiberId,
      this.status,
      this._concurrencyLevel.value,
      this.params.fiberRefs,
      this.params.scope,
      this.params.scheduler,
      this.params.supervisor,
      this.params.platform,
      this.params.parent,
      this.children,
      this._stackTrace,
    )
}

function parseCustomTrace(trace: string): Trace {
  const [file, method, line, column] = trace.split(/:/g)

  return new StackFrameTrace([
    {
      file,
      method,
      line: parseFloat(line),
      column: parseFloat(column),
    },
  ])
}
