import * as Either from 'hkt-ts/Either'
import { isJust } from 'hkt-ts/Maybe'
import { First } from 'hkt-ts/Typeclass/Concat'

import * as FiberRef from './FiberRef.js'
import * as FiberRefs from './FiberRefs.js'
import { AnyFx, Fx, fromCause, fromExit, lazy } from './Fx.js'
import { AnyInstruction, Match, Now } from './Instruction.js'

import { AnyCause, traced, unexpected } from '@/Cause/Cause.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import { AnyExit, Exit, makeSequentialAssociative } from '@/Exit/Exit.js'
import { Done, FiberStatus, Running, Suspended } from '@/FiberStatus/index.js'
import { addObserver } from '@/Future/Future.js'
import { Platform } from '@/Platform/Platform.js'
import { Stack } from '@/Stack/index.js'
import { Delay, Time } from '@/Time/index.js'
import { Trace, getTraceUpTo, getTrimmedTrace } from '@/Trace/Trace.js'

const concatExitSeq = makeSequentialAssociative<any, any>(First).concat

export type Frame = ExitFrame | ValueFrame | FinalizerFrame

export interface ExitFrame {
  readonly tag: 'Exit'
  readonly step: (exit: AnyExit) => AnyFx
}

export function ExitFrame(step: (a: AnyExit) => AnyFx): ExitFrame {
  return {
    tag: 'Exit',
    step,
  }
}

export interface ValueFrame {
  readonly tag: 'Value'
  readonly step: (a: any) => AnyFx
}

export function ValueFrame(step: (a: any) => AnyFx): ValueFrame {
  return {
    tag: 'Value',
    step,
  }
}

export interface FinalizerFrame {
  readonly tag: 'Finalizer'
  readonly step: (exit: AnyExit) => AnyFx
}

export function FinalizerFrame(step: (a: AnyExit) => AnyFx): FinalizerFrame {
  return {
    tag: 'Finalizer',
    step,
  }
}

// TODO: Handle Interrupts

export class FiberRuntime<R, E, A> {
  protected _started = false
  protected _current: AnyInstruction | null = this.fx.instr
  protected _status: FiberStatus
  protected _observers: Array<(exit: Exit<E, A>) => void> = []
  protected readonly _frames: Array<Frame> = []
  protected readonly _disposable: Settable = settable()

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly fiberRefs: FiberRefs.FiberRefs,
    readonly platform: Platform,
  ) {
    this._status = Suspended(this.getInterruptStatus)
  }

  readonly startSync = (): boolean => this.start(false)
  readonly startAsync = (): boolean => this.start(true)
  readonly addObserver = (observer: (exit: Exit<E, A>) => void): Disposable => {
    this._observers.push(observer)

    return Disposable(() => {
      const i = this._observers.indexOf(observer)

      if (i > -1) {
        this._observers.splice(i, 1)
      }
    })
  }

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
      this.pushPopFiberRef(FiberRef.CurrentTrace, Trace.custom(instr.__trace))
    }

    switch (instr.tag) {
      case 'Access':
        return this.processAccess(instr)
      case 'AddTrace':
        return this.processAddTrace(instr)
      case 'Ensuring':
        return this.processEnsuring(instr)
      case 'FiberRefLocally':
        return this.processFiberRefLocally(instr)
      case 'FlatMap':
        return this.processFlatMap(instr)
      case 'FromCause':
        return this.processFromCause(instr)
      case 'FromLazy':
        return this.processFromLazy(instr)
      case 'GetFiberRef':
        return this.processGetFiberRef(instr)
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

  protected processFromCause(instr: Extract<AnyInstruction, { readonly tag: 'FromCause' }>) {
    this.unwindStack(instr.cause)
  }

  protected processFromLazy(instr: Extract<AnyInstruction, { readonly tag: 'FromLazy' }>) {
    this.continueWith(instr.f())
  }

  protected processGetFiberRef(instr: Extract<AnyInstruction, { readonly tag: 'GetFiberRef' }>) {
    const current = FiberRefs.maybeGetFiberRefValue(
      instr.fiberRef as FiberRef.FiberRef<any, any, any>,
    )(this.fiberRefs)

    if (isJust(current)) {
      return this.continueWith(current.value)
    }

    this.pushFrame(
      ExitFrame((exit) =>
        lazy(() => {
          // Save this FiberRef for later
          if (Either.isRight(exit)) {
            FiberRefs.setFiberRef(
              instr.fiberRef as FiberRef.FiberRef<any, any, any>,
              exit.right,
            )(this.fiberRefs)
          }

          return fromExit(exit)
        }),
      ),
    )

    this._current = instr.fiberRef.initial.instr
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
    const current = FiberRefs.maybeGetFiberRefValue(ref)(this.fiberRefs)

    if (isJust(current)) {
      const [b, a] = instr.modify(current.value)

      FiberRefs.setFiberRef(ref, a)(this.fiberRefs)

      return this.continueWith(b)
    }

    this.pushFrame(
      ExitFrame((exit) =>
        lazy<AnyFx>(() => {
          // Save this FiberRef for later
          if (Either.isRight(exit)) {
            const [b, a] = instr.modify(exit.right)

            FiberRefs.setFiberRef(ref, a)(this.fiberRefs)

            return Now.make(b) as AnyFx
          }

          return fromCause(exit.left) as AnyFx
        }),
      ),
    )

    this._current = instr.fiberRef.initial.instr
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
    this.pushPopFiberRef(FiberRef.CurrentConcurrencyLevel, instr.concurrencyLevel)
    this._current = instr.fx.instr
  }

  protected processSetInterruptStatus(
    instr: Extract<AnyInstruction, { readonly tag: 'SetInterruptStatus' }>,
  ) {
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
      this._disposable.add(
        inner.add(
          addObserver(instr.future as any, (fx) => {
            if (!inner.isDisposed()) {
              inner.dispose()
              this.run((this._current = fx.instr))
            }
          }),
        ),
      ),
    )

    this._current = null
  }

  protected uncaughtException(error: unknown) {
    this.unwindStack(
      traced(getTrimmedTrace(unexpected(error), this.getInternalFiberRef(FiberRef.CurrentTrace)))(
        unexpected(error),
      ),
    )
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

    return (this._current = Match.make(frame.step(exit) as Fx<any, any, any>, fromCause, () =>
      Now.make(value),
    ) as any)
  }

  /**
   * Unwind the stack to handle any exceptions
   */
  protected unwindStack(cause: AnyCause) {
    let frame = this.popFrame()

    const exit = Either.Left(cause)

    while (frame) {
      if (frame.tag === 'Exit') {
        return (this._current = frame.step(exit).instr)
      }

      if (frame.tag === 'Finalizer') {
        return (this._current = Match.make(
          frame.step(exit) as Fx<any, any, any>,
          (cause) => fromExit(concatExitSeq(exit, Either.Left(cause))),
          () => fromExit(exit),
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

  protected done(exit: Exit<E, A>) {
    this._status = Done
    this._observers.forEach((o) => o(exit))
    this._observers = []
    this._current = null
  }

  protected setTimer = (f: (time: Time) => void): Disposable => {
    const inner = settable()

    inner.add(
      this._disposable.add(
        this.platform.timer.setTimer((time) => {
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
    FiberRefs.setFiberRefLocally(ref as any, value)(this.fiberRefs)

    this.pushFrame(
      ExitFrame((exit) =>
        lazy(() => {
          FiberRefs.popLocalFiberRef(ref as any)(this.fiberRefs)

          return fromExit(exit)
        }),
      ),
    )
  }

  protected getInternalFiberRef<R, E, A>(ref: FiberRef.FiberRef<R, E, A>): Stack<A> {
    const maybe = this.fiberRefs.locals.get().get(ref)

    if (maybe.tag === 'Just') {
      return maybe.value
    }

    throw new Error(
      `There is a bug in @typed/Fx's FiberRuntime now having access to expected FiberRef`,
    )
  }

  protected getCurrentTrace(): Trace {
    const maybe = this.fiberRefs.locals.get().get(FiberRef.CurrentTrace)

    if (maybe.tag === 'Just') {
      return getTraceUpTo(
        this.getInternalFiberRef(FiberRef.CurrentTrace),
        this.platform.maxTraceCount,
      )
    }

    throw new Error(
      `There is a bug in @typed/Fx's FiberRuntime now having access to the StackTrace`,
    )
  }
}
