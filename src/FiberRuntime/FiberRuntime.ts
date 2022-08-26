import { flow, pipe } from 'hkt-ts'
import * as A from 'hkt-ts/Array'
import * as Either from 'hkt-ts/Either'
import * as Maybe from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Concat'

import { ExitFrame, Frame, ValueFrame } from './Frame.js'

import { AtomicCounter, decrement } from '@/Atomic/AtomicCounter.js'
import * as Cause from '@/Cause/Cause.js'
import { prettyPrint } from '@/Cause/Renderer.js'
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
import { AnyInstruction } from '@/Fx/Instruction.js'
import { Layer } from '@/Layer/Layer.js'
import { closeOrWait } from '@/Scope/Closeable.js'
import { Semaphore, acquireFiber } from '@/Semaphore/Semaphore.js'
import { Stack } from '@/Stack/index.js'
import { Supervisor, isNone } from '@/Supervisor/Supervisor.js'
import { Delay, Time } from '@/Time/index.js'
import * as Trace from '@/Trace/Trace.js'

const concatExitSeq = Exit.makeSequentialAssociative<any, any>(First).concat
const concatExitPar = Exit.makeParallelAssociative<readonly any[], any>(
  A.makeAssociative<any>(),
).concat

type Processors = {
  readonly [K in AnyInstruction['tag']]: (
    instr: Extract<AnyInstruction, { readonly tag: K }>,
  ) => void
}

// TODO: Logging
// TODO: Metrics?
// TODO: Allow configuring

// TODO: tests for services + layers

export class FiberRuntime<F extends Fx.AnyFx>
  implements Fiber.Live<Fx.ErrorsOf<F>, Fx.OutputOf<F>>
{
  protected _started = false
  protected _current: Maybe.Maybe<AnyInstruction> = Maybe.Just(this.fx.instr)
  protected _status: FiberStatus
  protected _observers: Array<(exit: Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>) => void> = []
  protected _children: Array<FiberRuntime<Fx.AnyFx>> = []
  protected _opCountRemaining = AtomicCounter(this.context.platform.maxOpCount)
  protected _interruptedBy: Set<FiberId.FiberId> = new Set()
  protected _disposable: Settable = settable()
  protected _frames: Array<Frame> = []

  protected _processors: Processors = {
    Access: this.processAccess.bind(this),
    AddTrace: this.processAddTrace.bind(this),
    Both: this.processBoth.bind(this),
    DeleteFiberRef: this.processDeleteFiberRef.bind(this),
    Either: this.processEither.bind(this),
    FiberRefLocally: this.processFiberRefLocally.bind(this),
    FlatMap: this.processFlatMap.bind(this),
    Fork: this.processFork.bind(this),
    FromCause: this.processFromCause.bind(this),
    FromLazy: this.processFromLazy.bind(this),
    GetFiberContext: () => this.continueWith(this.context),
    GetFiberRef: this.processGetFiberRef.bind(this),
    GetInterruptStatus: this.processGetInterruptStatus.bind(this),
    GetTrace: this.processGetTrace.bind(this),
    Lazy: this.processLazy.bind(this),
    Map: this.processMap.bind(this),
    Match: this.processMatch.bind(this),
    ModifyFiberRef: this.processModifyFiberRef.bind(this),
    Now: this.processNow.bind(this),
    Provide: this.processProvide.bind(this),
    ProvideLayer: this.processProvideLayer.bind(this),
    ProvideService: this.processProvideService.bind(this),
    SetConcurrencyLevel: this.processSetConcurrencyLevel.bind(this),
    SetInterruptStatus: this.processSetInterruptStatus.bind(this),
    Wait: this.processWait.bind(this),
  }

  constructor(readonly fx: F, readonly context: FiberContext = FiberContext()) {
    // All Fibers start Suspended
    this._status = Suspended(this.getInterruptStatus)

    // The last thing every Fiber should do is wait for its Scope to close
    this._frames.push(ExitFrame(flow(closeOrWait(context.scope), Fx.flatMap(Fx.fromExit))))
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
        return Fx.now(this._status.exit)
      }

      const future = Pending<never, never, Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>>()
      this.addObserver((exit) => complete(future)(Fx.now(exit)))

      if (this.getInterruptStatus()) {
        // Immediately interrupt the Fiber
        this._disposable.dispose()
        this._disposable = settable()
        this.unwindStack(Cause.interrupted(id))
      } else {
        // Record the interrupting FiberId for if/when the interrupt status becomes true again.
        this._interruptedBy.add(id)
      }

      return wait(future)
    })

  // Start of Internals

  protected start(async: boolean) {
    if (this._started) {
      return false
    }

    this._started = true

    this.withSupervisor((s) => s.onStart(this, this.fx))

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

    while (Maybe.isJust(this._current)) {
      try {
        this.run(this._current.value)
      } catch (e) {
        this.uncaughtException(e)
      }
    }

    this.suspended()
  }

  protected run(instr: AnyInstruction) {
    // Yield when too many synchronous operations have occurred
    if (decrement(this._opCountRemaining) === 0) {
      this._opCountRemaining.set(this._opCountRemaining.id)
      this._current = Maybe.Nothing

      return this.setTimer(() => {
        this._current = Maybe.Just(instr)
        this.loop()
      })
    }

    if (instr.__trace) {
      this.pushPopFiberRef(FiberRef.CurrentTrace, Trace.Trace.custom(instr.__trace))
    }

    this.withSupervisor((s) => s.onInstruction(this, instr))
    ;(this._processors[instr.tag] as (i: typeof instr) => void)(instr)
  }

  protected processAccess(instr: Extract<AnyInstruction, { readonly tag: 'Access' }>) {
    this._current = Maybe.Just(instr.f(this.getInternalFiberRef(FiberRef.CurrentEnv).value).instr)
  }

  protected processAddTrace(instr: Extract<AnyInstruction, { readonly tag: 'AddTrace' }>) {
    this.pushPopFiberRef(FiberRef.CurrentTrace, instr.trace)
    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processBoth(instr: Extract<AnyInstruction, { readonly tag: 'Both' }>) {
    const withConcurrency = acquireFiber(
      this.getInternalFiberRef(FiberRef.CurrentConcurrencyLevel).value,
    )
    const f = new FiberRuntime(
      withConcurrency(instr.first),
      this.context.fork({ fiberRefs: this.context.fiberRefs }),
    )
    const s = new FiberRuntime(
      withConcurrency(instr.second),
      this.context.fork({ fiberRefs: this.context.fiberRefs }),
    )

    const [future, onExit] = bothFuture(f, s)

    const inner = settable()
    inner.add(this._disposable.add(f.addObserver((exit) => onExit(exit, 0))))
    inner.add(this._disposable.add(s.addObserver((exit) => onExit(exit, 1))))

    this._current = Maybe.Just(
      pipe(
        wait(future),
        Fx.ensuring(() => Fx.fromLazy(() => inner.dispose())),
      ).instr,
    )

    f.startSync()
    s.startSync()
  }

  protected processDeleteFiberRef(
    instr: Extract<AnyInstruction, { readonly tag: 'DeleteFiberRef' }>,
  ) {
    this.continueWith(
      pipe(
        this.context.fiberRefs,
        FiberRefs.deleteFiberRef(instr.fiberRef),
        Maybe.map((s) => s.value),
      ),
    )
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

    const inner = settable()
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
      inner.dispose()
    }

    inner.add(this._disposable.add(f.addObserver((exit) => onExit(exit, 0))))
    inner.add(this._disposable.add(s.addObserver((exit) => onExit(exit, 1))))

    this._current = Maybe.Just(wait(future).instr)

    f.startSync()
    s.startSync()
  }

  protected processFiberRefLocally(
    instr: Extract<AnyInstruction, { readonly tag: 'FiberRefLocally' }>,
  ) {
    this.pushPopFiberRef(instr.fiberRef, instr.value)
    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processFlatMap(instr: Extract<AnyInstruction, { readonly tag: 'FlatMap' }>) {
    this.pushFrame(ValueFrame(instr.f))
    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processFork(instr: Extract<AnyInstruction, { readonly tag: 'Fork' }>) {
    const runtime = new FiberRuntime(instr.fx, instr.context)

    this._children.push(runtime)
    instr.context.scope.ensuring(() =>
      Fx.fromLazy(() => this._children.splice(this._children.indexOf(runtime), 1)),
    )

    // All Child fibers should be started asynchronously to ensure they are capable of
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

    this._current = Maybe.Just(instr.fiberRef.initial.instr)
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
    this._current = Maybe.Just(instr.f().instr)
  }

  protected processMap(instr: Extract<AnyInstruction, { readonly tag: 'Map' }>) {
    this.pushFrame(ValueFrame((a) => Fx.now(instr.f(a))))
    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processMatch(instr: Extract<AnyInstruction, { readonly tag: 'Match' }>) {
    this.pushFrame(ExitFrame(Either.match(instr.onLeft as any, instr.onRight as any)))
    this._current = Maybe.Just(instr.fx.instr)
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

    this._current = Maybe.Just(
      pipe(
        FiberRefs.maybeGetFiberRefValue(ref)(this.context.fiberRefs),
        Maybe.match(() => instr.fiberRef.initial, Fx.now),
      ).instr,
    )
  }

  protected processNow(instr: Extract<AnyInstruction, { readonly tag: 'Now' }>) {
    this.continueWith(instr.value)
  }

  protected processProvide(instr: Extract<AnyInstruction, { readonly tag: 'Provide' }>) {
    this.pushPopFiberRef(FiberRef.CurrentEnv, instr.env)
    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processProvideLayer(instr: Extract<AnyInstruction, { readonly tag: 'ProvideLayer' }>) {
    const layers = this.getInternalFiberRef(FiberRef.Layers).value
    const layer = instr.layer as Layer<any, any, any>
    const context = this.context

    const unwindStack = (cause: Cause.AnyCause) =>
      this._status.tag === 'Done'
        ? context.scope.state.tag === 'Open'
          ? context.scope.close(Either.Left(cause))
          : Fx.fromLazy(() => this.reportFailure(cause))
        : Fx.fromLazy(() => this.unwindStack(cause))

    const provider = Fx.Fx(function* () {
      const exit = yield* Fx.attempt(Fx.uninterruptable(layer.build(context.scope)))

      if (Either.isLeft(exit)) {
        const cause = exit.left

        // Expected errors are not likely to match the calling Fiber.
        if (cause.tag === 'Expected') {
          yield* unwindStack(cause)

          return yield* Fx.never
        }

        // Unexpected errors should be fine to pass along
        return yield* Fx.fromCause(cause)
      }

      return exit.right
    })

    FiberRefs.setFiberRefLocally(
      FiberRef.Layers,
      layers.set(layer.service, [
        () => {
          const fiber = new FiberRuntime(provider, this.context.fork())
          fiber.startAsync()
          return fiber
        },
        Maybe.Nothing,
      ]),
    )(context.fiberRefs)

    this.popFiberRef(FiberRef.Layers)

    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processProvideService(
    instr: Extract<AnyInstruction, { readonly tag: 'ProvideService' }>,
  ) {
    FiberRefs.setFiberRefLocally(
      FiberRef.Services,
      this.getInternalFiberRef(FiberRef.Services).value.set(instr.service, instr.implementation),
    )(this.context.fiberRefs)

    this.popFiberRef(FiberRef.Services)

    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processSetConcurrencyLevel(
    instr: Extract<AnyInstruction, { readonly tag: 'SetConcurrencyLevel' }>,
  ) {
    this.pushPopFiberRef(FiberRef.CurrentConcurrencyLevel, new Semaphore(instr.concurrencyLevel))
    this._current = Maybe.Just(instr.fx.instr)
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

    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processWait(instr: Extract<AnyInstruction, { readonly tag: 'Wait' }>) {
    const state = instr.future.state.get()

    if (state.tag === 'Resolved') {
      return (this._current = Maybe.Just(state.fx.instr))
    }

    const inner = settable()

    inner.add(
      addObserver(instr.future as any, (fx) => {
        if (!inner.isDisposed()) {
          inner.dispose()
          this._current = Maybe.Just(fx.instr)
          this.setTimer(() => this.loop())
        }
      }),
    )

    inner.add(this._disposable.add(inner))

    this._current = Maybe.Nothing
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

    // We're at the end of the stack, notify any observers
    if (!frame) {
      return this.done(Either.Right(value))
    }

    return (this._current = Maybe.Just(
      frame.step(frame.tag === 'Value' ? value : Either.Right(value)).instr,
    ))
  }

  /**
   * Unwind the stack to handle any exceptions
   */
  protected unwindStack(cause: Cause.AnyCause) {
    let frame = this.popFrame()

    while (frame) {
      if (frame.tag === 'Exit') {
        return (this._current = Maybe.Just(frame.step(Either.Left(cause)).instr))
      }

      // Skip any Value frames since they don't handle failures
      frame = this.popFrame()
    }

    // We only got here if there are no more Cause handlers, exit the Fiber
    this.done(Either.Left(cause))
  }

  protected running() {
    if (this._status.tag === 'Suspended') {
      this._status = Running(this.getInterruptStatus)
      this.withSupervisor((s) => s.onRunning(this))
    }
  }

  protected suspended() {
    if (this._status.tag === 'Running') {
      this._status = Suspended(this.getInterruptStatus)
      this.withSupervisor((s) => s.onSuspended(this))
    }
  }

  protected done(exit: Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>) {
    this._status = Done(exit)
    this._current = Maybe.Nothing
    this.withSupervisor((s) => s.onEnd(this, exit))
    this.notifyObservers(exit)
  }

  protected notifyObservers(exit: Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>) {
    // If there are no observers, and we've encountered a failure, report the failure.
    if (this._observers.length === 0 && Either.isLeft(exit)) {
      return this.reportFailure(exit.left)
    }

    if (this._observers.length > 0) {
      this._observers.forEach((o) => o(exit))
      this._observers = []
    }
  }

  protected reportFailure(cause: Cause.AnyCause) {
    this.context.platform.reportFailure(
      [FiberId.debug(this.id), prettyPrint(cause, this.context.renderer)].join('\n'),
    )
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

    this.popFiberRef(ref)
  }

  protected popFiberRef = (ref: FiberRef.AnyFiberRef) => {
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

  protected withSupervisor = <A>(f: (s: Supervisor<A>) => void) => {
    const s = this.context.supervisor

    if (isNone(s)) {
      return
    }

    f(s)
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
