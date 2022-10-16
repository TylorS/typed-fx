import { Left, Right, isRight } from 'hkt-ts/Either'
import { pipe } from 'hkt-ts/function'

import { Effect } from './Effect.js'
import { EffectSupervisor } from './EffectSupervisor.js'
import * as Op from './Op.js'
import { async, flatMap, fromLazy, now } from './ops.js'

import * as Cause from '@/Cause/Cause.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import type { Env } from '@/Env/Env.js'
import { Exit } from '@/Exit/Exit.js'
import * as FiberId from '@/FiberId/FiberId.js'
import { Done, FiberStatus, Running, Suspended } from '@/FiberStatus/index.js'
import { Platform } from '@/Platform/Platform.js'
import { Stack } from '@/Stack/index.js'
import { Delay } from '@/Time/index.js'

const concatSeqCause = Cause.makeSequentialAssociative<any>().concat

export interface EffectRuntimeConfig {
  readonly supervisor?: EffectSupervisor
  readonly interruptStatus?: boolean
  readonly cooperativeYielding?: boolean
}

export class EffectRuntime<R, E, A> {
  protected _started = false
  protected _status: FiberStatus<E, A> = Suspended
  protected _op: Op.Op | null = this.effect.op
  protected _env: Stack<Env<any>> = new Stack(this.env)
  protected _frames: Array<Op.ControlFrame> = []
  protected _observers: Array<(exit: Exit<E, A>) => void> = []
  protected _interruptedBy: Set<FiberId.FiberId> = new Set()
  protected _interruptStatus: Stack<boolean> = new Stack(this.runtimeConfig.interruptStatus ?? true)
  protected _disposable: Settable | null = null
  protected _opCount = 0
  protected _cooperativeYielding = this.runtimeConfig.cooperativeYielding ?? false

  constructor(
    readonly effect: Effect<R, E, A>,
    readonly platform: Platform,
    readonly env: Env<R>,
    readonly id: FiberId.FiberId.Live = FiberId.Live(platform),
    readonly runtimeConfig: EffectRuntimeConfig = {},
  ) {}

  get status(): FiberStatus<E, A> {
    return this._status
  }

  start(sync = true): boolean {
    if (this._started) {
      return false
    }

    this._started = true

    const start = () => {
      this.runtimeConfig.supervisor?.onStart?.(this)
      this.loop()
    }

    if (sync) {
      start()
    } else {
      this.setTimer(start)
    }

    return true
  }

  addObserver(f: (exit: Exit<E, A>) => void): Disposable {
    const status = this._status

    // Always emit Exit value asynchronously
    if (status.tag === 'Done') {
      return this.setTimer(() => f(status.exit))
    }

    this._observers.push(f)

    return Disposable(() => {
      const i = this._observers.indexOf(f)

      if (i > -1) {
        this._observers.splice(i, 1)
      }
    })
  }

  interruptAs(id: FiberId.FiberId): Effect<never, never, Exit<E, A>> {
    this._interruptedBy.add(id)

    if (this._interruptStatus.value && this._status.tag !== 'Done') {
      this.continueWithCause(this.getInterruptCause(Cause.Empty))
    }

    return async<never, never, Exit<E, A>>((cb) =>
      this._status.tag === 'Done'
        ? Right(now(this._status.exit))
        : Left(this.addObserver((exit) => cb(now(exit)))),
    )
  }

  protected loop() {
    this.running()

    while (this._op) {
      try {
        this.step(this._op)
      } catch (e) {
        this.continueWithCause(Cause.unexpected(e))
      }
    }

    this.suspended()
  }

  protected step(op: Op.Op) {
    if (this._cooperativeYielding && this._opCount++ === this.platform.maxOpCount) {
      return this.yieldNow(op)
    }

    this.runtimeConfig.supervisor?.onOp?.(this, op)
    ;(this[op.tag] as (_: typeof op) => void)(op)
  }

  protected AskEnv() {
    this.continueWith(this._env.value)
  }

  protected Provide(instr: Op.Provide) {
    this._env = this._env.push(instr.env)
    this._op = new Op.PopFrame(instr.effect, () => (this._env = this._env.pop() ?? this._env))
  }

  protected Fail(instr: Op.Fail) {
    this.continueWithCause(instr.cause)
  }

  protected Now(instr: Op.Now) {
    this.continueWith(instr.value)
  }

  protected FromLazy(instr: Op.FromLazy) {
    this.continueWith(instr.f())
  }

  protected Lazy(instr: Op.Lazy) {
    this._op = instr.f().op
  }

  protected Bimap = this.ControlFrame
  protected Map = this.ControlFrame
  protected MapLeft = this.ControlFrame
  protected Exit = this.ControlFrame
  protected FlatMap = this.ControlFrame
  protected OrElse = this.ControlFrame
  protected Pop = this.ControlFrame
  protected Interrupt(frame: Op.InterruptFrame) {
    this._interruptStatus = this._interruptStatus.push(frame.interruptStatus)
    this.ControlFrame(frame)
  }
  protected ControlFrame(frame: Op.ControlFrame) {
    this._op = frame.effect.op
    this._frames.push(frame)
  }

  protected Async(instr: Op.Async) {
    // Suspend this Runtime, before calling async registration,
    // just in case it returns synchronously.
    this._op = null
    let run = false

    const inner = settable()
    const either = instr.f((effect) => {
      // Can only be resumed 1 time
      if (run) {
        return
      }

      run = true

      this._op = pipe(
        fromLazy(() => inner.dispose()),
        flatMap(() => effect),
      ).op

      this.loop()
    })

    // If it returns a Right, continue Synchronously
    if (isRight(either)) {
      this._op = either.right.op
      return
    }

    inner.add(either.left)
    inner.add(this.addDisposable(inner))
  }

  protected continueWith(a: any) {
    const frame = this._frames.pop()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.runtimeConfig.supervisor?.onValue?.(this, this._op!, a, frame)

    if (!frame) {
      return this.done(Right(a))
    }

    const tag = frame.tag

    if (tag === 'FlatMap') {
      return (this._op = frame.f(a).op)
    } else if (tag === 'Exit') {
      return (this._op = frame.f(Right(a)).op)
    } else if (tag === 'Interrupt' && this.shouldInterrupt()) {
      return this.continueWithCause(this.getInterruptCause(Cause.Empty))
    }

    if (tag === 'Map') {
      a = frame.f(a)
    } else if (tag === 'Bimap') {
      a = frame.g(a)
    } else if (tag === 'Pop') {
      frame.pop()
    }

    this.continueWith(a)
  }

  protected continueWithCause(cause: Cause.Cause<any>) {
    const frame = this._frames.pop()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.runtimeConfig.supervisor?.onCause?.(this, this._op!, cause, frame)

    if (!frame) {
      return this.done(Left(cause))
    }

    const tag = frame.tag

    if (tag === 'Exit') {
      return (this._op = frame.f(Left(cause)).op)
    } else if (tag === 'OrElse') {
      return (this._op = frame.f(cause).op)
    }

    if (tag === 'Bimap' || tag === 'MapLeft') {
      cause = frame.f(cause)
    } else if (tag === 'Interrupt' && this.shouldInterrupt()) {
      cause = this.getInterruptCause(cause)
    } else if (tag === 'Pop') {
      frame.pop()
    }

    this.continueWithCause(cause)
  }

  protected yieldNow(op: Op.Op) {
    this._opCount = 0
    this._op = null

    this.setTimer(() => {
      this._op = op
      this.loop()
    })
  }

  protected running() {
    if (this._status.tag === 'Suspended') {
      this._status = Running
      this.runtimeConfig.supervisor?.onRunning?.(this)
    }
  }

  protected suspended() {
    if (this._status.tag === 'Running') {
      this._status = Suspended
      this.runtimeConfig.supervisor?.onSuspended?.(this)
    }
  }

  protected done(exit: Exit<E, A>) {
    this._status = Done(exit)
    this._op = null
    this.runtimeConfig.supervisor?.onDone?.(this, exit)
    this._disposable?.dispose()
    this._observers.forEach((f) => f(exit))
    this._observers = []
  }

  protected setTimer(f: () => void) {
    const inner = settable()

    inner.add(
      this.platform.timer.setTimer(() => {
        inner.dispose()
        f()
      }, Delay(0)),
    )

    return this.addDisposable(inner)
  }

  protected addDisposable(inner: Settable) {
    if (!this._disposable) {
      this._disposable = settable()
    }

    inner.add(this._disposable.add(inner))

    return inner
  }

  protected getInterruptCause(init: Cause.Cause<any>) {
    return Array.from(this._interruptedBy).reduceRight(
      (a: Cause.Cause<any>, b) => concatSeqCause(a, Cause.interrupted(b)),
      init,
    )
  }

  protected shouldInterrupt() {
    return (
      this.popInterruptStatus() &&
      this._interruptedBy.size > 0 &&
      !!this._frames.find((f) => f.tag !== 'Pop')
    )
  }

  protected popInterruptStatus() {
    this._interruptStatus = this._interruptStatus.pop() ?? this._interruptStatus

    return this._interruptStatus.value
  }
}
