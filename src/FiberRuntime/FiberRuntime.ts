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
import * as Builtin from '@/FiberRef/builtins.js'
import * as FiberRefs from '@/FiberRefs/FiberRefs.js'
import { Done, FiberStatus, Running, Suspended } from '@/FiberStatus/index.js'
import { Pending, addObserver, complete, wait } from '@/Future/index.js'
import * as Fx from '@/Fx/Fx.js'
import { AnyInstruction } from '@/Fx/Instruction.js'
import { join } from '@/Fx/join.js'
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
    AddTrace: this.processAddTrace.bind(this),
    Both: this.processBoth.bind(this),
    DeleteFiberRef: this.processDeleteFiberRef.bind(this),
    Either: this.processEither.bind(this),
    FiberRefLocally: this.processFiberRefLocally.bind(this),
    FlatMap: this.processFlatMap.bind(this),
    Fork: this.processFork.bind(this),
    FromCause: this.processFromCause.bind(this),
    FromLazy: this.processFromLazy.bind(this),
    GetEnv: this.processGetEnv.bind(this),
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

  constructor(readonly fx: F, readonly context: FiberContext<FiberId.Live> = FiberContext()) {
    // All Fibers start Suspended
    this._status = Suspended

    // The last thing every Fiber should do is wait for its Scope to close
    this._frames.push(ExitFrame(flow(closeOrWait(context.scope), Fx.flatMap(Fx.fromExit))))
  }

  readonly tag = 'Live'
  readonly id: FiberId.Live = this.context.id
  readonly status = Fx.fromLazy(() => this._status)
  readonly trace = Fx.fromLazy(() => this.getCurrentTrace())
  readonly exit = Fx.lazy(() => {
    if (this._status.tag === 'Done') {
      return Fx.now(this._status.exit)
    }

    const future = Pending<never, never, Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>>()
    this.addObserver(flow(Fx.now, complete(future)))
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
    if (this._status.tag === 'Done') {
      const exit = this._status.exit
      return this.setTimer(() => observer(exit))
    }

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
      if (this.getInterruptStatus()) {
        // Immediately interrupt the Fiber
        this._disposable.dispose()
        this._disposable = settable()
        this._current = Maybe.Just(Fx.interrupted(id).instr)
        this.loop()
      } else {
        // Record the interrupting FiberId for if/when the interrupt status becomes true again.
        this._interruptedBy.add(id)
      }

      return this.exit
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
        this.step(this._current.value)
      } catch (e) {
        this.uncaughtException(e)
      }
    }

    this.suspended()
  }

  protected step(instr: AnyInstruction) {
    // Yield when too many synchronous operations have occurred
    if (decrement(this._opCountRemaining) === 0) {
      return this.yieldNow(instr)
    }

    this.addCustomTrace(instr.__trace)
    this.withSupervisor((s) => s.onInstruction(this, instr))
    ;(this._processors[instr.tag] as (i: typeof instr) => void)(instr)
  }

  protected yieldNow(instr: AnyInstruction) {
    this._opCountRemaining.set(this._opCountRemaining.initial)
    this._current = Maybe.Nothing

    return this.setTimer(() => {
      this._current = Maybe.Just(instr)
      this.loop()
    })
  }

  protected addCustomTrace(trace?: string) {
    if (trace) {
      this.pushPopFiberRef(Builtin.CurrentTrace, this.getRuntimeTrace())
      this.pushPopFiberRef(Builtin.CurrentTrace, Trace.Trace.custom(trace))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processGetEnv(_: Extract<AnyInstruction, { readonly tag: 'GetEnv' }>) {
    this.withFiberRef(Builtin.CurrentEnv, (stack) => Fx.now(stack.value))
  }

  protected processAddTrace(instr: Extract<AnyInstruction, { readonly tag: 'AddTrace' }>) {
    this.pushPopFiberRef(Builtin.CurrentTrace, Trace.concat(instr.trace, this.getRuntimeTrace()))
    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processBoth(instr: Extract<AnyInstruction, { readonly tag: 'Both' }>) {
    this.withFiberRef(Builtin.CurrentConcurrencyLevel, (semaphore) => {
      const withConcurrency = acquireFiber(semaphore.value)

      const f = new FiberRuntime(withConcurrency(instr.first), this.context.fork())
      const s = new FiberRuntime(withConcurrency(instr.second), this.context.fork())

      const [future, onExit] = bothFuture(f, s)

      const inner = settable()

      inner.add(f.addObserver((exit) => onExit(exit, 0)))
      inner.add(s.addObserver((exit) => onExit(exit, 1)))
      inner.add(this._disposable.add(inner))

      f.startSync()
      s.startSync()

      return pipe(
        wait(future),
        Fx.ensuring(() =>
          Fx.fromLazy(() => {
            FiberRefs.join(this.context.fiberRefs, f.context.fiberRefs)
            FiberRefs.join(this.context.fiberRefs, s.context.fiberRefs)

            inner.dispose()
          }),
        ),
      )
    })
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
    this.withFiberRef(Builtin.CurrentConcurrencyLevel, (semaphore) => {
      const withConcurrency = acquireFiber(semaphore.value)
      const f = new FiberRuntime(withConcurrency(instr.first), this.context.fork())
      const s = new FiberRuntime(withConcurrency(instr.second), this.context.fork())

      const inner = settable()
      const future = Pending<never, any, any>()
      const onExit = (exit: Exit.Exit<Fx.ErrorsOf<F>, any>, index: 0 | 1) => {
        complete(future)(
          pipe(
            Fx.fromExit(exit),
            Fx.ensuring(() =>
              index === 0
                ? pipe(
                    s.interruptAs(f.context.id),
                    Fx.tapLazy(() => FiberRefs.join(this.context.fiberRefs, f.context.fiberRefs)),
                  )
                : pipe(
                    f.interruptAs(s.context.id),
                    Fx.tapLazy(() => FiberRefs.join(this.context.fiberRefs, s.context.fiberRefs)),
                  ),
            ),
          ),
        )

        inner.dispose()
      }

      inner.add(f.addObserver((exit) => onExit(pipe(exit, Either.map(Either.Left)), 0)))
      inner.add(s.addObserver((exit) => onExit(pipe(exit, Either.map(Either.Right)), 1)))
      inner.add(this._disposable.add(inner))

      f.startSync()
      s.startSync()

      return wait(future)
    })
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
    const child = new FiberRuntime(instr.fx, instr.context)

    this._children.push(child)

    child._disposable.add(
      Disposable(() => {
        const i = this._children.indexOf(child)
        if (i > -1) {
          this._children.splice(i, 1)
        }
      }),
    )

    if (instr.async) {
      child.startAsync()
    } else {
      child.startSync()
    }

    this.continueWith(child)
  }

  protected processFromCause(instr: Extract<AnyInstruction, { readonly tag: 'FromCause' }>) {
    const interruptedCause = Cause.findInterrupted(instr.cause)
    if (Maybe.isJust(interruptedCause) && this._children.length > 0) {
      const interrupts = this._children.map((c) => c.interruptAs(this.id))
      this._children = []

      // Cancel all Child Fibers and then continue with the Cause
      this._current = Maybe.Just(
        Fx.flatMap(() => Fx.fromCause(instr.cause))(Fx.fork(Fx.zipAll(interrupts))).instr,
      )
    } else {
      this.unwindStack(instr.cause)
    }
  }

  protected processFromLazy(instr: Extract<AnyInstruction, { readonly tag: 'FromLazy' }>) {
    this.continueWith(instr.f())
  }

  protected processGetFiberRef(instr: Extract<AnyInstruction, { readonly tag: 'GetFiberRef' }>) {
    this.withFiberRef(instr.fiberRef, (s) => Fx.now(s.value))
  }

  protected processGetInterruptStatus(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: Extract<AnyInstruction, { readonly tag: 'GetInterruptStatus' }>,
  ) {
    this.continueWith(this.getInterruptStatus())
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processGetTrace(_: Extract<AnyInstruction, { readonly tag: 'GetTrace' }>) {
    this.pushPopFiberRef(Builtin.CurrentTrace, this.getRuntimeTrace())
    this.continueWith(this.getCurrentTrace())
  }

  protected processLazy(instr: Extract<AnyInstruction, { readonly tag: 'Lazy' }>) {
    this._current = Maybe.Just(instr.f().instr)
  }

  protected processMap(instr: Extract<AnyInstruction, { readonly tag: 'Map' }>) {
    this.pushFrame(ValueFrame(flow(instr.f, Fx.now)))
    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processMatch(instr: Extract<AnyInstruction, { readonly tag: 'Match' }>) {
    this.pushFrame(ExitFrame(Either.match(instr.onLeft, instr.onRight)))
    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processModifyFiberRef(
    instr: Extract<AnyInstruction, { readonly tag: 'ModifyFiberRef' }>,
  ) {
    this.withFiberRef(instr.fiberRef, (stack) => {
      const [b, a] = instr.modify(stack.value)

      FiberRefs.setFiberRef(instr.fiberRef, a)(this.context.fiberRefs)

      return Fx.now(b)
    })
  }

  protected processNow(instr: Extract<AnyInstruction, { readonly tag: 'Now' }>) {
    this.continueWith(instr.value)
  }

  protected processProvide(instr: Extract<AnyInstruction, { readonly tag: 'Provide' }>) {
    this.pushPopFiberRef(Builtin.CurrentEnv, instr.env)
    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processProvideLayer(instr: Extract<AnyInstruction, { readonly tag: 'ProvideLayer' }>) {
    this.withFiberRef(Builtin.Layers, (layers) => {
      const layer = instr.layer
      const context = this.context

      const unwindStack = (cause: Cause.AnyCause): Fx.Of<any> =>
        this._status.tag === 'Done'
          ? context.scope.state.tag === 'Open'
            ? context.scope.close(Either.Left(cause))
            : Fx.fromLazy(() => this.reportFailure(cause))
          : Fx.fromLazy(() => this.unwindStack(cause))

      const provider = pipe(
        Fx.uninterruptable(layer.build(context.scope)),
        Fx.orElseCause((cause) =>
          cause.tag === 'Expected'
            ? pipe(
                unwindStack(cause),
                Fx.flatMap(() => Fx.never),
              )
            : Fx.fromCause(cause),
        ),
      )

      return pipe(
        instr.fx,
        Fx.fiberRefLocally(
          Builtin.Layers,
          layers.value.set(layer.service, [
            () => {
              const fiber = new FiberRuntime(provider, this.context.fork())
              fiber.startSync()
              return fiber as Fiber.Live<never, any>
            },
            Maybe.Nothing,
          ]) as any,
        ),
      )
    })
  }

  protected processProvideService(
    instr: Extract<AnyInstruction, { readonly tag: 'ProvideService' }>,
  ) {
    this.withFiberRef(Builtin.CurrentEnv, (env) =>
      pipe(
        instr.fx,
        Fx.fiberRefLocally(
          Builtin.CurrentEnv,
          env.value.addService(instr.service, instr.implementation),
        ),
      ),
    )
  }

  protected processSetConcurrencyLevel(
    instr: Extract<AnyInstruction, { readonly tag: 'SetConcurrencyLevel' }>,
  ) {
    this.pushPopFiberRef(Builtin.CurrentConcurrencyLevel, new Semaphore(instr.concurrencyLevel))
    this._current = Maybe.Just(instr.fx.instr)
  }

  protected processSetInterruptStatus(
    instr: Extract<AnyInstruction, { readonly tag: 'SetInterruptStatus' }>,
  ) {
    const currentlyInterruptable = this.getInterruptStatus()

    FiberRefs.setFiberRefLocally(
      Builtin.CurrentInterruptStatus,
      instr.interruptStatus,
    )(this.context.fiberRefs)

    this.pushFrame(
      ExitFrame((exit) =>
        Fx.lazy(() => {
          FiberRefs.popLocalFiberRef(Builtin.CurrentInterruptStatus)(this.context.fiberRefs)

          if (currentlyInterruptable && this._interruptedBy.size > 0) {
            return Fx.fromExit(
              Array.from(this._interruptedBy).reduce(
                (e, id) => concatExitSeq(e, Exit.interrupt(id)),
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

    // Add Stack trace before asynchrony occurs
    this.pushPopFiberRef(Builtin.CurrentTrace, this.getRuntimeTrace())

    const inner = settable()

    inner.add(
      addObserver(instr.future, (fx) => {
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
    this.withFiberRef(Builtin.CurrentTrace, (stackTrace) => {
      const trimmed = Trace.getTrimmedTrace(Cause.unexpected(error), stackTrace)
      const current = Trace.getTraceUpTo(
        stackTrace.push(trimmed),
        this.context.platform.maxTraceCount,
      )
      const cause = Cause.traced(Trace.concat(trimmed, current))(Cause.unexpected(error))

      return Fx.fromCause(cause)
    })
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
      this._status = Running
      this.withSupervisor((s) => s.onRunning(this))
    }
  }

  protected suspended() {
    if (this._status.tag === 'Running') {
      this._status = Suspended
      this.withSupervisor((s) => s.onSuspended(this))
    }
  }

  protected done(exit: Exit.Exit<Fx.ErrorsOf<F>, Fx.OutputOf<F>>) {
    this._status = Done(exit)
    this._current = Maybe.Nothing
    this._disposable.dispose()
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
      [FiberId.debug(this.id), prettyPrint(cause, this.context.platform.renderer)].join('\n'),
    )
  }

  protected setTimer = (f: (time: Time) => void): Disposable => {
    const inner = settable()

    inner.add(
      this.context.platform.timer.setTimer((time) => {
        inner.dispose()
        f(time)
      }, Delay(0)),
    )

    inner.add(this._disposable.add(inner))

    return inner
  }

  protected getInterruptStatus = (): boolean =>
    pipe(
      this.context.fiberRefs,
      FiberRefs.maybeGetFiberRefValue(Builtin.CurrentInterruptStatus),
      Maybe.getOrElse(() => true),
    )

  protected pushPopFiberRef = (ref: FiberRef.AnyFiberRef, value: any) => {
    FiberRefs.setFiberRefLocally(ref, value)(this.context.fiberRefs)

    this.pushFrame(
      ExitFrame((exit) => {
        FiberRefs.popLocalFiberRef(ref)(this.context.fiberRefs)

        return Fx.fromExit(exit)
      }),
    )
  }

  protected withFiberRef<R, E, A, R2, E2, B>(
    ref: FiberRef.FiberRef<R, E, A>,
    f: (a: Stack<A>) => Fx.Fx<R2, E2, B>,
  ): void {
    const fiberRefs = this.context.fiberRefs
    const currentValue = fiberRefs.locals.get().get(ref)

    if (Maybe.isJust(currentValue)) {
      this._current = Maybe.Just(f(currentValue.value).instr)
      return
    }

    const initializing = fiberRefs.initializing.get()
    const initializingFiber = initializing.get(ref)

    if (Maybe.isJust(initializingFiber)) {
      this._current = Maybe.Just(
        pipe(
          (initializingFiber.value as Fiber.Live<E, A>).exit,
          Fx.flatMap(Fx.fromExit),
          Fx.flatMap((a) => f(new Stack(a))),
        ).instr,
      )
      return
    }

    this._current = Maybe.Just(
      pipe(
        Fx.forkInContext(this.context.fork({ fiberRefs: this.context.fiberRefs }))(ref.initial),
        Fx.tap((fiber) =>
          Fx.fromLazy(() => fiberRefs.initializing.modify((a) => [null, a.set(ref, fiber)])),
        ),
        Fx.flatMap(join),
        Fx.ensuring((exit) =>
          Fx.fromLazy(() => {
            fiberRefs.initializing.modify((a) => [null, a.remove(ref)])

            if (Either.isRight(exit)) {
              FiberRefs.setFiberRef(ref, exit.right)(this.context.fiberRefs)
            }
          }),
        ),
        Fx.flatMap((a) => f(new Stack(a))),
      ).instr,
    )
  }

  protected getCurrentTrace(): Trace.Trace {
    return pipe(
      this.context.fiberRefs,
      FiberRefs.maybeGetFiberRefStack(Builtin.CurrentTrace),
      Maybe.match(
        () => Trace.Trace.runtime(new Error()),
        (stackTrace) => Trace.getTraceUpTo(stackTrace, this.context.platform.maxTraceCount),
      ),
    )
  }

  protected getRuntimeTrace(): Trace.Trace {
    return pipe(
      this.context.fiberRefs,
      FiberRefs.maybeGetFiberRefStack(Builtin.CurrentTrace),
      Maybe.match(
        () => Trace.Trace.runtime(new Error()),
        (stackTrace) => Trace.getTrimmedTrace(Cause.Empty, stackTrace),
      ),
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
