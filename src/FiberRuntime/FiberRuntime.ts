import { Either, Left, Right, isLeft } from 'hkt-ts/Either'
import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'
import { Strict } from 'hkt-ts/Typeclass/Eq'
import { NonNegativeInteger } from 'hkt-ts/number'

import { FiberRuntimeParams } from './FiberRuntimeParams'
// eslint-disable-next-line import/no-cycle
import { InstructionProcessor } from './InstructionProcessor'
import { RuntimeInstruction } from './RuntimeInstruction'
import { RuntimeIterable } from './RuntimeIterable'

import { Atomic } from '@/Atomic/Atomic'
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
import { StackTrace } from '@/StackTrace/StackTrace'
import { EmptyTrace, StackFrameTrace, Trace } from '@/Trace/Trace'

export class FiberRuntime<R, E, A> {
  protected _environment: Stack<Env<any>> = new Stack(this.params.env)
  protected _interruptStatus: Stack<boolean> = new Stack(true)
  protected _concurrencyLevel: Stack<Semaphore> = new Stack(
    new Semaphore(this.params.platform.maxConcurrency),
  )
  protected _interruptedBy: Array<FiberId> = []
  protected _stackTrace = new StackTrace(this.params.fiberId, new Stack<Trace>(EmptyTrace))
  protected _children = new Map<FiberId, Fiber.Live<any, any>>()
  protected _fiberStatus: Atomic<FiberStatus<E, A>>
  protected _generators: Generator<RuntimeInstruction<E>, any, any>[]
  protected _suspends: RuntimeIterable<E, any> | null = null

  get status(): FiberStatus<E, A> {
    return this._fiberStatus.get
  }

  get children(): ReadonlySet<Fiber.Live<any, any>> {
    return new Set(this._children.values())
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

  get context(): FiberContext {
    return this.getFiberContext()
  }

  readonly exit: Future<never, never, Exit<E, A>> = pending()

  constructor(readonly fx: Fx<R, E, A>, readonly params: FiberRuntimeParams<R>) {
    this._fiberStatus = new Atomic<FiberStatus<E, A>>(
      new FiberStatus.Suspended(this.params.fiberId, new Set()),
      Strict,
    )

    this._generators = [new InstructionProcessor(fx, params)[Symbol.iterator]()]
  }

  readonly start = (): void => {
    if (this._fiberStatus.get.tag !== 'Exited') {
      this.processGenerator(this._generators[0], this._generators[0].next())
    }
  }

  readonly addObserver = (observer: FiberStatus.Observer<E, A>) => {
    this._fiberStatus.update(FiberStatus.addObserver(observer))

    return () => this._fiberStatus.update(FiberStatus.removeObserver(observer))
  }

  readonly interrupt = (fiberId: FiberId): Of<Exit<E, A>> => {
    this._interruptedBy.push(fiberId)

    if (this._interruptStatus.value) {
      this.finalize(interrupt(fiberId))
    }

    return wait(this.exit)
  }

  protected processGenerator = (
    generator: Generator<RuntimeInstruction<E>, any>,
    result: IteratorResult<RuntimeInstruction<E>, any>,
  ): Maybe<any> => {
    while (!result.done) {
      const either = this.processInstruction(result.value)

      if (isLeft(either)) {
        if (either.left) {
          this.start()
        }

        return Nothing
      }

      result = generator.next(either.right)
    }

    // Remove this generator from the stack
    this._generators.shift()

    // Continue processing if needed
    if (this._generators.length > 0) {
      return this.processGenerator(this._generators[0], this._generators[0].next(result.value))
    }

    this.finalize(result.value)

    return Just(result.value)
  }

  protected processInstruction(instr: RuntimeInstruction<E>): Either<boolean, any> {
    switch (instr.tag) {
      case 'Fail': {
        const exit = Left(instr.cause)

        this.finalize(exit)

        return Left(false)
      }
      case 'GetConcurrencyLevel':
        return Right(this.concurrencyLevel)
      case 'GetCurrentFiberContext':
        return Right(this.getFiberContext())
      case 'GetEnvironment':
        return Right(this._environment.value)
      case 'GetInterruptStatus':
        return Right(this.interruptStatus)
      case 'GetTrace':
        return Right(this.stackTrace)
      case 'PopConcurrencyLevel': {
        this._concurrencyLevel = this._concurrencyLevel.pop() || this._concurrencyLevel
        return Right(undefined)
      }
      case 'PopEnvironment': {
        this._environment = this._environment.pop() || this._environment
        return Right(undefined)
      }
      case 'PopInterruptStatus': {
        this._interruptStatus = this._interruptStatus.pop() || this._interruptStatus

        if (this._interruptedBy.length > 0 && this._interruptStatus.value) {
          this.finalize(interrupt(this._interruptedBy[0]))
        }

        return Right(undefined)
      }
      case 'PopTrace': {
        this._stackTrace = this._stackTrace.pop() || this._stackTrace
        return Right(undefined)
      }
      case 'PushConcurrencyLevel': {
        this._concurrencyLevel = this._concurrencyLevel.push(new Semaphore(instr.concurrencyLevel))
        return Right(undefined)
      }
      case 'PushEnvironment': {
        this._environment = this._environment.push(instr.env)
        return Right(undefined)
      }
      case 'PushInterruptStatus': {
        this._interruptStatus = this._interruptStatus.push(instr.interruptStatus)
        return Right(undefined)
      }
      case 'PushTrace': {
        this._stackTrace.push(parseCustomTrace(instr.trace))
        return Right(undefined)
      }
      case 'Suspend': {
        if (this._suspends) {
          throw new Error(`Unable to suspend a single fiber more than once at a time`)
        }

        return Right((ri: RuntimeIterable<E, any>) => {
          this._suspends = ri
        })
      }
      case 'Resume': {
        if (this._suspends) {
          const iterable = this._suspends
          this._suspends = null
          this._generators.unshift(iterable[Symbol.iterator]())

          return Left(true)
        }

        throw new Error(`Unable to Resume a Fiber which has not been suspended`)
      }
      case 'YieldNow': {
        Promise.resolve().then(() => this.start())

        return Left(false)
      }
    }

    return Left(false)
  }

  protected finalize = (exit: Exit<E, A>) => {
    const currentStatus = this._fiberStatus.getAndSet(
      new FiberStatus.Exited(this.params.fiberId, exit),
    )

    if (currentStatus.tag !== 'Exited') {
      currentStatus.observers.forEach((o) => o(exit))
      complete(success(exit))(this.exit)
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
