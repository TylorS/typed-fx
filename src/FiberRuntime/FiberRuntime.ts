import { flow, pipe } from 'hkt-ts'
import * as A from 'hkt-ts/Array'
import * as Either from 'hkt-ts/Either'
import * as Maybe from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Concat'

import { AtomicCounter, decrement } from '@/Atomic/AtomicCounter.js'
import * as Cause from '@/Cause/Cause.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import * as Exit from '@/Exit/Exit.js'
import * as Fiber from '@/Fiber/Fiber.js'
import { FiberContext } from '@/FiberContext/FiberContext.js'
import * as FiberId from '@/FiberId/FiberId.js'
import * as FiberRef from '@/FiberRef/FiberRef.js'
import * as FiberRefs from '@/FiberRefs/FiberRefs.js'
import { Done, FiberStatus, Running, Suspended } from '@/FiberStatus/index.js'
import { Pending, addObserver, complete, wait } from '@/Future/index.js'
import * as Fx from '@/Fx/Fx.js'
import { AnyInstruction, Match, Now } from '@/Fx/Instruction.js'
import { closeOrWait } from '@/Scope/Closeable.js'
import { Semaphore } from '@/Semaphore/Semaphore.js'
import { Stack } from '@/Stack/index.js'
import { Delay, Time } from '@/Time/index.js'
import * as Trace from '@/Trace/Trace.js'

const concatExitSeq = Exit.makeSequentialAssociative<any, any>(First).concat
const concatExitPar = Exit.makeParallelAssociative<readonly any[], any>(
  A.makeAssociative<any>(),
).concat

export type Frame = ExitFrame | ValueFrame | FinalizerFrame

export interface ExitFrame {
  readonly tag: 'Exit'
  readonly step: (exit: Exit.AnyExit) => Fx.AnyFx
}

export function ExitFrame(step: (a: Exit.AnyExit) => Fx.AnyFx): ExitFrame {
  return {
    tag: 'Exit',
    step,
  }
}

export interface ValueFrame {
  readonly tag: 'Value'
  readonly step: (a: any) => Fx.AnyFx
}

export function ValueFrame(step: (a: any) => Fx.AnyFx): ValueFrame {
  return {
    tag: 'Value',
    step,
  }
}

export interface FinalizerFrame {
  readonly tag: 'Finalizer'
  readonly step: (exit: Exit.AnyExit) => Fx.AnyFx
}

export function FinalizerFrame(step: (a: Exit.AnyExit) => Fx.AnyFx): FinalizerFrame {
  return {
    tag: 'Finalizer',
    step,
  }
}

// TODO: Supervisors
// TODO: Logging
// TODO: Metrics?
// TODO: Allow configuring

export class FiberRuntime<F extends Fx.AnyFx>
  implements Fiber.Live<Fx.ErrorsOf<F>, Fx.OutputOf<F>>
{
  protected _started = false
  protected _current: AnyInstruction | null = this.fx.instr
  protected _status: FiberStatus
  protected _observers: Array<(exit: Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>) => void> = []
  protected _children: Array<FiberRuntime<Fx.AnyFx>> = []
  protected _opCountRemaining = AtomicCounter(this.context.platform.maxOpCount)
  protected _interruptedBy: Set<FiberId.FiberId> = new Set()
  protected _disposable: Settable = settable()

  protected readonly _frames: Array<Frame> = []

  constructor(readonly fx: F, readonly context: FiberContext = FiberContext()) {
    // All Fibers start Suspended
    this._status = Suspended(this.getInterruptStatus)

    // The last thing every Fiber should do is wait for its Scope to close
    this._frames.push(FinalizerFrame((exit) => closeOrWait(context.scope, exit)))
  }

  readonly tag = 'Live'
  readonly id: FiberId.Live = this.context.id
  readonly status = Fx.fromLazy(() => this._status)
  readonly trace = Fx.fromLazy(() => this.getCurrentTrace())
  readonly exit = Fx.lazy(() => {
    const future = Pending<never, never, Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>>()

    this.addObserver(flow(Fx.success, complete(future)))

    return wait(future)
  })

  /**
   * Start running this Fiber synchronously. It can potentially exit BEFORE being able to cancel it.
   */
  readonly startSync = (): boolean => this.start(false)

  /**
   * Start running this Fiber asynchronously. It can never exit before being able to cancel its work.
   */
  readonly startAsync = (): boolean => this.start(true)

  /**
   * Add an Observer to the current Fiber's Exit value
   */
  readonly addObserver = (
    observer: (exit: Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>) => void,
  ): Disposable => {
    this._observers.push(observer)

    return Disposable(() => {
      const i = this._observers.indexOf(observer)

      if (i > -1) {
        this._observers.splice(i, 1)
      }
    })
  }

  readonly interruptAs = (id: FiberId.FiberId): Fx.Of<Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>> =>
    Fx.lazy(() => {
      if (this._status.tag === 'Done') {
        return Now.make(this._status.exit)
      }

      const future = Pending<never, never, Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>>()
      this.addObserver((exit) => complete(future)(Now.make(exit)))

      if (this.getInterruptStatus()) {
        // Immediately interrupt the Fiber
        this.unwindStack(Cause.interrupted(id))
        this._disposable.dispose()
        this._disposable = settable()

        return wait(future)
      }

      // Record the interrupting FiberId for if/when the interrupt status becomes true again.
      this._interruptedBy.add(id)

      return wait(future)
    })

  // Start of Internals

  protected start(async: boolean) {
    if (this._started) {
      return false
    }

    this._started = true

    // Schedule to start the event loop
    if (async) {
      this.setTimer(() => this.loop())
    } else {
      this.loop()
    }

    return true
  }

  protected loop() {
    this.running()

    while (this._current) {
      try {
        this.run(this._current)
      } catch (e) {
        this.uncaughtException(e)
      }
    }

    this.suspended()
  }

  protected run(instr: AnyInstruction) {
    if (instr.__trace) {
      this.pushPopFiberRef(FiberRef.CurrentTrace, Trace.Trace.custom(instr.__trace))
    }

    // Yield when too many synchronous operations have occurred
    if (decrement(this._opCountRemaining) === 0) {
      this._opCountRemaining.set(this._opCountRemaining.id)
      this._current = null

      return this.setTimer(() => {
        this._current = instr
        this.loop()
      })
    }

    switch (instr.tag) {
      case 'Access':
        return this.processAccess(instr)
      case 'AddTrace':
        return this.processAddTrace(instr)
      case 'Both':
        return this.processBoth(instr)
      case 'Either':
        return this.processEither(instr)
      case 'Ensuring':
        return this.processEnsuring(instr)
      case 'FiberRefLocally':
        return this.processFiberRefLocally(instr)
      case 'FlatMap':
        return this.processFlatMap(instr)
      case 'Fork':
        return this.processFork(instr)
      case 'FromCause':
        return this.processFromCause(instr)
      case 'FromLazy':
        return this.processFromLazy(instr)
      case 'GetFiberContext':
        return this.continueWith(this.context)
      case 'GetFiberRef':
        return this.processGetFiberRef(instr)
      case 'GetInterruptStatus':
        return this.processGetInterruptStatus(instr)
      case 'GetTrace':
        return this.processGetTrace(instr)
      case 'Lazy':
        return this.processLazy(instr)
      case 'Map':
        return this.processMap(instr)
      case 'Match':
        return this.processMatch(instr)
      case 'ModifyFiberRef':
        return this.processModifyFiberRef(instr)
      case 'Now':
        return this.processNow(instr)
      case 'Provide':
        return this.processProvide(instr)
      case 'SetConcurrencyLevel':
        return this.processSetConcurrencyLevel(instr)
      case 'SetInterruptStatus':
        return this.processSetInterruptStatus(instr)
      case 'Wait':
        return this.processWait(instr)
    }
  }

  protected processAccess(instr: Extract<AnyInstruction, { readonly tag: 'Access' }>) {
    this._current = instr.f(this.getInternalFiberRef(FiberRef.CurrentEnv).value as any).instr
  }

  protected processAddTrace(instr: Extract<AnyInstruction, { readonly tag: 'AddTrace' }>) {
    this.pushPopFiberRef(FiberRef.CurrentTrace, instr.trace)
    this._current = instr.fx.instr
  }

  protected processBoth(instr: Extract<AnyInstruction, { readonly tag: 'Both' }>) {
    const f = new FiberRuntime(
      instr.first,
      this.context.fork({ fiberRefs: this.context.fiberRefs }),
    )
    const s = new FiberRuntime(
      instr.second,
      this.context.fork({ fiberRefs: this.context.fiberRefs }),
    )

    const [future, onExit] = bothFuture(f, s)

    const inner = settable()
    inner.add(this._disposable.add(f.addObserver((exit) => onExit(exit, 0))))
    inner.add(this._disposable.add(s.addObserver((exit) => onExit(exit, 1))))

    this._current = pipe(
      wait(future),
      Fx.ensuring(() => Fx.fromLazy(() => inner.dispose())),
    ).instr

    f.startSync()
    s.startSync()
  }

  protected processEither(instr: Extract<AnyInstruction, { readonly tag: 'Either' }>) {
    const f = new FiberRuntime(
      instr.first,
      this.context.fork({ fiberRefs: this.context.fiberRefs }),
    )
    const s = new FiberRuntime(
      instr.first,
      this.context.fork({ fiberRefs: this.context.fiberRefs }),
    )

    const future = Pending<never, any, any>()
    const onExit = (exit: Exit.Exit<Fx.ErrorsOf<F>, any>, index: 0 | 1) => {
      complete(future)(
        pipe(
          Fx.fromExit(exit),
          Fx.ensuring(() =>
            index === 0 ? s.interruptAs(f.context.id) : f.interruptAs(s.context.id),
          ),
        ),
      )
    }

    const inner = settable()
    inner.add(this._disposable.add(f.addObserver((exit) => onExit(exit, 0))))
    inner.add(this._disposable.add(s.addObserver((exit) => onExit(exit, 1))))

    this._current = wait(future).instr

    f.startSync()
    s.startSync()
  }

  protected processEnsuring(instr: Extract<AnyInstruction, { readonly tag: 'Ensuring' }>) {
    this._frames.push(FinalizerFrame(instr.ensure as any))
    this._current = instr.fx.instr
  }

  protected processFiberRefLocally(
    instr: Extract<AnyInstruction, { readonly tag: 'FiberRefLocally' }>,
  ) {
    this.pushPopFiberRef(instr.fiberRef, instr.value)
    this._current = instr.fx.instr
  }

  protected processFlatMap(instr: Extract<AnyInstruction, { readonly tag: 'FlatMap' }>) {
    this.pushFrame(ValueFrame(instr.f))
    this._current = instr.fx.instr
  }

  protected processFork(instr: Extract<AnyInstruction, { readonly tag: 'Fork' }>) {
    const scope = this.context.scope.fork()
    const runtime = new FiberRuntime(instr.fx, this.context.fork({ scope }))

    this._children.push(runtime)
    scope.ensuring(() =>
      Fx.fromLazy(() => this._children.splice(this._children.indexOf(runtime), 1)),
    )

    // All Child fibers should be start asynchronously to ensure they are capable of
    // being interrupted *before* any work has been started and could steal the thread.
    runtime.startAsync()

    this.continueWith(runtime)
  }

  protected processFromCause(instr: Extract<AnyInstruction, { readonly tag: 'FromCause' }>) {
    this.unwindStack(instr.cause)
  }

  protected processFromLazy(instr: Extract<AnyInstruction, { readonly tag: 'FromLazy' }>) {
    this.continueWith(instr.f())
  }

  protected processGetFiberRef(instr: Extract<AnyInstruction, { readonly tag: 'GetFiberRef' }>) {
    const current = FiberRefs.maybeGetFiberRefValue(
      instr.fiberRef as FiberRef.FiberRef<any, any, any>,
    )(this.context.fiberRefs)

    if (Maybe.isJust(current)) {
      return this.continueWith(current.value)
    }

    this.pushFrame(
      ValueFrame((a) =>
        Fx.fromLazy(() => {
          FiberRefs.setFiberRef(
            instr.fiberRef as FiberRef.FiberRef<any, any, any>,
            a,
          )(this.context.fiberRefs)

          return a
        }),
      ),
    )

    this._current = instr.fiberRef.initial.instr
  }

  protected processGetInterruptStatus(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: Extract<AnyInstruction, { readonly tag: 'GetInterruptStatus' }>,
  ) {
    this.continueWith(this.getInterruptStatus())
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processGetTrace(_: Extract<AnyInstruction, { readonly tag: 'GetTrace' }>) {
    this.continueWith(this.getCurrentTrace())
  }

  protected processLazy(instr: Extract<AnyInstruction, { readonly tag: 'Lazy' }>) {
    this._current = instr.f().instr
  }

  protected processMap(instr: Extract<AnyInstruction, { readonly tag: 'Map' }>) {
    this.pushFrame(ValueFrame((a) => Now.make(instr.f(a))))
    this._current = instr.fx.instr
  }

  protected processMatch(instr: Extract<AnyInstruction, { readonly tag: 'Match' }>) {
    this.pushFrame(ExitFrame(Either.match(instr.onLeft as any, instr.onRight as any)))
    this._current = instr.fx.instr
  }

  protected processModifyFiberRef(
    instr: Extract<AnyInstruction, { readonly tag: 'ModifyFiberRef' }>,
  ) {
    const ref = instr.fiberRef as FiberRef.FiberRef<any, any, any>
    const current = FiberRefs.maybeGetFiberRefValue(ref)(this.context.fiberRefs)

    if (Maybe.isJust(current)) {
      const [b, a] = instr.modify(current.value)

      FiberRefs.setFiberRef(ref, a)(this.context.fiberRefs)

      return this.continueWith(b)
    }

    this.pushFrame(
      ValueFrame((i) =>
        Fx.fromLazy(() => {
          const [b, a] = instr.modify(i)

          FiberRefs.setFiberRef(ref, a)(this.context.fiberRefs)

          return b
        }),
      ),
    )

    this._current = pipe(
      FiberRefs.maybeGetFiberRefValue(ref)(this.context.fiberRefs),
      Maybe.match(() => instr.fiberRef.initial, Now.make),
    ).instr
  }

  protected processNow(instr: Extract<AnyInstruction, { readonly tag: 'Now' }>) {
    this.continueWith(instr.value)
  }

  protected processProvide(instr: Extract<AnyInstruction, { readonly tag: 'Provide' }>) {
    this.pushPopFiberRef(FiberRef.CurrentEnv, instr.env)
    this._current = instr.fx.instr
  }

  protected processSetConcurrencyLevel(
    instr: Extract<AnyInstruction, { readonly tag: 'SetConcurrencyLevel' }>,
  ) {
    this.pushPopFiberRef(FiberRef.CurrentConcurrencyLevel, new Semaphore(instr.concurrencyLevel))
    this._current = instr.fx.instr
  }

  protected processSetInterruptStatus(
    instr: Extract<AnyInstruction, { readonly tag: 'SetInterruptStatus' }>,
  ) {
    const current = this.getInterruptStatus()

    FiberRefs.setFiberRefLocally(
      FiberRef.CurrentInterruptStatus,
      instr.interruptStatus,
    )(this.context.fiberRefs)

    this.pushFrame(
      ExitFrame((exit) =>
        Fx.lazy(() => {
          FiberRefs.popLocalFiberRef(FiberRef.CurrentInterruptStatus)(this.context.fiberRefs)

          if (current && this._interruptedBy.size > 0) {
            return Fx.fromExit(
              Array.from(this._interruptedBy).reduce(
                (e, id) => concatExitSeq(e, Either.Left(Cause.interrupted(id))),
                exit,
              ),
            )
          }

          return Fx.fromExit(exit)
        }),
      ),
    )

    this.pushPopFiberRef(FiberRef.CurrentInterruptStatus, instr.interruptStatus)
    this._current = instr.fx.instr
  }

  protected processWait(instr: Extract<AnyInstruction, { readonly tag: 'Wait' }>) {
    const state = instr.future.state.get()

    if (state.tag === 'Resolved') {
      return (this._current = state.fx.instr)
    }

    const inner = settable()

    inner.add(
      addObserver(instr.future as any, (fx) => {
        if (!inner.isDisposed()) {
          inner.dispose()
          this._current = fx.instr
          this.setTimer(() => this.loop())
        }
      }),
    )

    inner.add(this._disposable.add(inner))

    this._current = null
  }

  protected uncaughtException(error: unknown) {
    const stackTrace = this.getInternalFiberRef(FiberRef.CurrentTrace)
    const trimmed = Trace.getTrimmedTrace(Cause.unexpected(error), stackTrace)
    const current = Trace.getTraceUpTo(stackTrace, this.context.platform.maxTraceCount)
    const cause = Cause.traced(Trace.concat(trimmed, current))(Cause.unexpected(error))

    this.unwindStack(cause)
  }

  protected pushFrame(frame: Frame) {
    this._frames.push(frame)
  }

  protected popFrame() {
    return this._frames.pop()
  }

  protected continueWith(value: any) {
    const frame = this.popFrame()

    const exit = Either.Right(value)

    // We're at the end of the stack, notify any observers
    if (!frame) {
      return this.done(exit)
    }

    if (frame.tag === 'Value') {
      return (this._current = frame.step(value).instr)
    }

    if (frame.tag === 'Exit') {
      return (this._current = frame.step(exit).instr)
    }

    return (this._current = Match.make(frame.step(exit) as Fx.Fx<any, any, any>, Fx.fromCause, () =>
      Now.make(value),
    ) as any)
  }

  /**
   * Unwind the stack to handle any exceptions
   */
  protected unwindStack(cause: Cause.AnyCause) {
    let frame = this.popFrame()

    const exit = Either.Left(cause)

    while (frame) {
      if (frame.tag === 'Exit') {
        return (this._current = frame.step(exit).instr)
      }

      if (frame.tag === 'Finalizer') {
        return (this._current = Match.make(
          frame.step(exit) as Fx.Fx<any, any, any>,
          (cause) => Fx.fromExit(concatExitSeq(exit, Either.Left(cause))),
          () => Fx.fromExit(exit),
        ) as any)
      }

      // Skip any Value frames since they don't handle failures
      frame = this.popFrame()
    }

    // We only got here if there are no more Cause handlers, exit the Fiber
    this.done(exit)
  }

  protected running() {
    if (this._status.tag === 'Suspended') {
      this._status = Running(this.getInterruptStatus)
    }
  }

  protected suspended() {
    if (this._status.tag === 'Running') {
      this._status = Suspended(this.getInterruptStatus)
    }
  }

  protected done(exit: Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>) {
    this._status = Done(exit)
    this._observers.forEach((o) => o(exit))
    this._observers = []
    this._current = null
  }

  protected setTimer = (f: (time: Time) => void): Disposable => {
    const inner = settable()

    inner.add(
      this._disposable.add(
        this.context.platform.timer.setTimer((time) => {
          inner.dispose()
          f(time)
        }, Delay(0)),
      ),
    )

    return inner
  }

  protected getInterruptStatus = (): boolean =>
    this.getInternalFiberRef(FiberRef.CurrentInterruptStatus).value

  protected pushPopFiberRef = (ref: FiberRef.AnyFiberRef, value: any) => {
    FiberRefs.setFiberRefLocally(ref as any, value)(this.context.fiberRefs)

    this.pushFrame(
      ExitFrame((exit) =>
        Fx.lazy(() => {
          FiberRefs.popLocalFiberRef(ref as any)(this.context.fiberRefs)

          return Fx.fromExit(exit)
        }),
      ),
    )
  }

  protected getInternalFiberRef<R, E, A>(ref: FiberRef.FiberRef<R, E, A>): Stack<A> {
    const maybe = this.context.fiberRefs.locals.get().get(ref)

    if (maybe.tag === 'Just') {
      return maybe.value
    }

    throw new Error(
      `There is a bug in @typed/Fx's FiberRuntime not having access to expected FiberRef`,
    )
  }

  protected getCurrentTrace(): Trace.Trace {
    const maybe = this.context.fiberRefs.locals.get().get(FiberRef.CurrentTrace)

    if (maybe.tag === 'Just') {
      return Trace.getTraceUpTo(
        this.getInternalFiberRef(FiberRef.CurrentTrace),
        this.context.platform.maxTraceCount,
      )
    }

    throw new Error(
      `There is a bug in @typed/Fx's FiberRuntime not having access to the StackTrace`,
    )
  }
}

function bothFuture(f: FiberRuntime<Fx.AnyFx>, s: FiberRuntime<Fx.AnyFx>) {
  const exits: Exit.Exit<any, any>[] = []
  const future = Pending<never, any, any>()

  function onExit(exit: Exit.Exit<any, any>, i: 0 | 1) {
    exits[i] = Either.tupled(exit)

    if (exits[0] && exits[1]) {
      return complete(future)(Fx.fromExit(concatExitPar(exits[0], exits[1])))
    }

    if (Either.isLeft(exit)) {
      return complete(future)(
        pipe(
          Fx.fromExit(exit),
          Fx.ensuring(() => (i === 0 ? s.interruptAs(f.id) : f.interruptAs(s.id))),
        ),
      )
    }
  }

  return [future, onExit] as const
}
