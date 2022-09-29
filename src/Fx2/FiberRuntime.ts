import * as Either from 'hkt-ts/Either'
import { First } from 'hkt-ts/Typeclass/Associative'
import { flow, pipe } from 'hkt-ts/function'

import { Env } from './Env.js'
import { Fiber } from './Fiber.js'
import { FiberRefs } from './FiberRef.js'
import { FrameManager } from './FrameManager.js'
import { Pending, complete } from './Future.js'
import { Fx } from './Fx.js'
import * as Instr from './Instruction.js'
import { InterruptManager } from './InterruptManager.js'
import { Observer, Observers } from './Observers.js'
import { Closeable, LocalScope, closeOrWait } from './Scope.js'
import { fromCause, fromExit, fromLazy, lazy, now } from './constructors.js'
import { ensuring, flatMap, map, wait } from './control-flow.js'
import { interruptAllAs } from './interrupts.js'
import { getFiberRefs } from './intrinsics.js'

import { AtomicCounter, decrement } from '@/Atomic/AtomicCounter.js'
import * as Cause from '@/Cause/index.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import * as Exit from '@/Exit/index.js'
import * as FiberId from '@/FiberId/FiberId.js'
import * as FiberStatus from '@/FiberStatus/index.js'
import { Platform } from '@/Platform/Platform.js'
import { Stack } from '@/Stack/index.js'
import { Delay } from '@/Time/index.js'

const concatExitSeq = Exit.makeSequentialAssociative<any, any>(First).concat

export interface FiberRuntimeOptions {
  readonly enableTracing: boolean
  readonly enableCooperativeYielding: boolean
  readonly interruptStatus: boolean
}

export function FiberRuntimeOptions(
  options: Partial<FiberRuntimeOptions> = {},
): FiberRuntimeOptions {
  return {
    enableTracing: options.enableTracing ?? false,
    enableCooperativeYielding: options.enableCooperativeYielding ?? false,
    interruptStatus: options.interruptStatus ?? true,
  }
}

// TODO: Allow scope closes *before* Fiber exit to interrupt the Fiber

export class FiberRuntime<R, E, A> implements Fiber<E, A> {
  protected _status: FiberStatus.FiberStatus = FiberStatus.Suspended
  protected _currentEnv: Stack<Env<any>> | null = null
  protected _disposable: Settable | null = null
  protected _children: Array<Fiber<any, any>> = []
  protected _frameManager = new FrameManager<E, A>([], (exit) => this.done(exit))
  protected _interruptManager = new InterruptManager(this.options.interruptStatus)
  protected _observers = new Observers<E, A>()
  protected _remainingOpCount = AtomicCounter(this.platform.maxOpCount)

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly env: Env<R>,
    readonly platform: Platform = Platform(),
    readonly fiberRefs: FiberRefs = FiberRefs(),
    readonly scope: Closeable = new LocalScope(),
    readonly options: FiberRuntimeOptions = FiberRuntimeOptions(),
  ) {
    // Ensure that if the Scope closes early, we exit the Fiber
    // Conversely, ensure that the Scope is closed after the Fx finishing running.
    this._frameManager.setInstr(
      pipe(
        scope.ensuring((exit) =>
          fromLazy(() => {
            this._frameManager.setInstr(fromExit(exit))

            if (this._status === FiberStatus.Suspended) {
              this.setTimer(() => this.start())
            }
          }),
        ),
        flatMap((finalizer) => pipe(fx, ensuring(finalizer))),
        ensuring(closeOrWait(scope)),
      ),
    )
  }

  public start() {
    this.running()

    while (this._frameManager.instr) {
      try {
        this.step(this._frameManager.instr)
      } catch (e) {
        this._frameManager.continueWithCause(Cause.unexpected(e))
      }
    }

    this.suspended()
  }

  public addObserver(observer: Observer<E, A>) {
    if (this._status.tag === 'Done') {
      const exit = this._status.exit
      return this.setTimer(() => observer(exit))
    }
    return this._observers.add(observer)
  }

  readonly id: FiberId.FiberId.Live = FiberId.Live(this.platform)

  readonly exit = lazy(() => {
    if (this._status.tag === 'Done') {
      return now(this._status.exit)
    }

    const future = Pending<never, never, Exit.Exit<E, A>>()
    this.addObserver(flow(now, complete(future)))
    return wait(future)
  })

  readonly join = pipe(
    this.exit,
    flatMap((exit) => {
      if (Either.isLeft(exit)) {
        return fromCause(exit.left)
      }

      return pipe(
        this.inheritRefs,
        map(() => exit.right),
      )
    }),
  )

  readonly inheritRefs = pipe(
    getFiberRefs,
    flatMap((refs) => refs.inherit(this.fiberRefs)),
  )

  readonly interruptAs: (id: FiberId.FiberId) => Fx.Of<boolean> = (id) =>
    lazy(() => {
      if (this._interruptManager.interruptAs(id)) {
        this._frameManager.setInstr(
          pipe(
            interruptAllAs(this._interruptManager.makeFiberId())(...this._children),
            ensuring(() => fromCause(this._interruptManager.makeCause())),
          ),
        )

        // Restart fiber if Suspended
        if (this._status === FiberStatus.Suspended) {
          this.setTimer(() => this.start())
        }

        return now(true)
      }

      return now(false)
    })

  protected step(instr: Instr.Instruction) {
    if (this.options.enableCooperativeYielding && this.shouldYield()) {
      return this.yieldNow(instr)
    }

    ;(this[instr.tag] as (i: typeof instr) => void)(instr)
  }

  protected shouldYield() {
    if (decrement(this._remainingOpCount) === 0) {
      this._remainingOpCount.set(this.platform.maxOpCount)
      return true
    }
    return false
  }

  protected yieldNow(instr: Instr.Instruction) {
    console.log('yielding')

    this._frameManager.instr = null

    this.setTimer(() => {
      this._frameManager.setInstr(instr)
      this.start()
    })
  }

  protected Now(instr: Instr.Now<any>) {
    this._frameManager.continueWith(instr.value)
  }

  protected Fail(instr: Instr.Fail<any>) {
    this._frameManager.continueWithCause(instr.cause)
  }

  protected FromLazy(instr: Instr.FromLazy<any>) {
    this._frameManager.continueWith(instr.f())
  }

  protected LazyFx(instr: Instr.LazyFx<any, any, any>) {
    this._frameManager.setInstr(instr.f())
  }

  protected GetFiberId() {
    this._frameManager.continueWith(this.id)
  }

  protected GetFiberRefs() {
    this._frameManager.continueWith(this.fiberRefs)
  }

  protected GetPlatform() {
    this._frameManager.continueWith(this.platform)
  }

  protected GetEnv() {
    this._frameManager.continueWith(this._currentEnv?.value ?? this.env)
  }

  protected GetScope() {
    return this._frameManager.continueWith(this.scope)
  }

  protected ProvideEnv(instr: Instr.ProvideEnv<any, any, any>) {
    const currentEnv = (this._currentEnv =
      this._currentEnv?.push(instr.env) ?? new Stack(instr.env))
    this._frameManager.pushFrames(new Instr.PopFrame(() => (this._currentEnv = currentEnv.pop())))
  }

  protected SetInterruptStatus(instr: Instr.SetInterruptStatus<any, any, any>) {
    const currentStatus = this._interruptManager.getInterruptStatus()
    const resetStatus = this._interruptManager.setInterruptStatus(instr.interruptStatus)

    // If the current status is Interruptable we should check if we need to interrupt
    // the fiber when we reset the status
    if (currentStatus) {
      this._frameManager.pushFrames(
        new Instr.AttemptFrame((exit) => {
          resetStatus.dispose()

          if (this._interruptManager.shouldInterrupt() && this._frameManager.hasFrames()) {
            return pipe(
              interruptAllAs(this._interruptManager.makeFiberId())(...this._children),
              flatMap(() =>
                fromExit(concatExitSeq(Either.Left(this._interruptManager.makeCause()), exit)),
              ),
            )
          }

          return fromExit(exit)
        }),
      )
    } else {
      this._frameManager.pushFrames(new Instr.PopFrame(() => resetStatus.dispose()))
    }

    this._frameManager.setInstr(instr.fx)
  }

  protected ControlFrame(instr: Instr.ControlFrame<any, any, any, any, any, any>) {
    this._frameManager.pushFrames(...instr.frames)
    this._frameManager.setInstr(instr.fx)
  }

  protected Wait(instr: Instr.Wait<any, any, any>) {
    const state = instr.future.state.get()

    if (state.tag === 'Done') {
      return this._frameManager.setInstr(state.fx)
    }

    this._frameManager.instr = null

    state.observers.push((fx) => {
      this._frameManager.setInstr(fx)

      if (this._status === FiberStatus.Suspended) {
        this.start()
      }
    })
  }

  protected Fork(instr: Instr.Fork<any, any, any>) {
    this._frameManager.setInstr(
      pipe(
        this.scope.fork,
        flatMap((scope) =>
          fromLazy(() => {
            const child = new FiberRuntime(
              instr.fx,
              this._currentEnv?.value ?? this.env,
              this.platform.fork(),
              this.fiberRefs.fork(),
              scope,
            )

            this._children.push(child)

            child.addDisposable(() =>
              Disposable(() => {
                const index = this._children.indexOf(child)
                if (index !== -1) {
                  this._children.splice(index, 1)
                }
              }),
            )

            // Always start fibers asynchronously
            this.setTimer(() => child.start())

            return child
          }),
        ),
      ),
    )
  }

  protected BothFx(instr: Instr.BothFx<any, any, any, any, any, any>) {
    const env = this._currentEnv?.value ?? this.env
    const platform = this.platform.fork()

    this._frameManager.setInstr(
      pipe(
        this.scope.fork,
        flatMap((s1) =>
          pipe(
            this.scope.fork,
            flatMap((s2) =>
              fromLazy(() => {
                const left = new FiberRuntime(instr.left, env, platform, this.fiberRefs, s1)
                const right = new FiberRuntime(instr.right, env, platform, this.fiberRefs, s2)

                left.start()
                right.start()

                return bothFuture(left, right)
              }),
            ),
          ),
        ),
      ),
    )
  }

  protected EitherFx(instr: Instr.EitherFx<any, any, any, any, any, any>) {
    const env = this._currentEnv?.value ?? this.env
    const platform = this.platform.fork()

    this._frameManager.setInstr(
      pipe(
        this.scope.fork,
        flatMap((s1) =>
          pipe(
            this.scope.fork,
            flatMap((s2) =>
              fromLazy(() => {
                const left = new FiberRuntime(instr.left, env, platform, this.fiberRefs, s1)
                const right = new FiberRuntime(instr.right, env, platform, this.fiberRefs, s2)

                left.start()
                right.start()

                return eitherFuture(left, right)
              }),
            ),
          ),
        ),
      ),
    )
  }

  protected running() {
    if (this._status === FiberStatus.Suspended) {
      this._status = FiberStatus.Running
    }
  }

  protected suspended() {
    if (this._status === FiberStatus.Running) {
      this._status = FiberStatus.Suspended
    }
  }

  protected done(exit: Exit.Exit<E, A>) {
    this._frameManager.instr = null
    this._status = FiberStatus.Done(exit)
    this._disposable?.dispose()
    this._observers.notify(exit)
  }

  protected setTimer(f: () => void): Disposable {
    return this.addDisposable((remove) =>
      this.platform.timer.setTimer(() => {
        remove()
        f()
      }, Delay(0)),
    )
  }

  protected addDisposable(f: (remove: () => void) => Disposable): Disposable {
    if (this._disposable) {
      const inner = settable()
      inner.add(f(() => inner.dispose()))
      inner.add(this._disposable.add(inner))
      return inner
    } else {
      this._disposable = settable()

      return this.addDisposable(f)
    }
  }
}

function bothFuture<R, E, A, R2, E2, B>(
  first: FiberRuntime<R, E, A>,
  second: FiberRuntime<R2, E2, B>,
) {
  let left = null as Exit.Exit<E, A> | null
  let right = null as Exit.Exit<E2, B> | null
  const future = Pending<never, E | E2, readonly [A, B]>()

  function onExit(exit: Exit.Exit<E, A>, i: 0): void
  function onExit(exit: Exit.Exit<E2, B>, i: 1): void
  function onExit(exit: Exit.Exit<E, A> | Exit.Exit<E2, B>, i: 0 | 1) {
    if (Either.isLeft<Cause.Cause<E | E2>, A | B>(exit)) {
      complete(future)(
        pipe(
          i === 0 ? second.interruptAs(first.id) : first.interruptAs(second.id),
          flatMap(() => fromCause<E | E2>(exit.left)),
        ),
      )
    }

    if (i === 0) {
      left = exit as Exit.Exit<E, A>
    } else {
      right = exit as Exit.Exit<E2, B>
    }

    if (left && right) {
      complete(future)(fromExit(Exit.both<E, A, E2, B>(left, right)))
    }
  }

  first.addObserver((exit) => onExit(exit, 0))
  second.addObserver((exit) => onExit(exit, 1))

  return wait(future)
}

function eitherFuture<R, E, A, R2, E2, B>(
  first: FiberRuntime<R, E, A>,
  second: FiberRuntime<R2, E2, B>,
) {
  const future = Pending<never, E | E2, Either.Either<A, B>>()

  function onExit(exit: Exit.Exit<E, A>, i: 0): void
  function onExit(exit: Exit.Exit<E2, B>, i: 1): void
  function onExit(exit: Exit.Exit<E, A> | Exit.Exit<E2, B>, i: 0 | 1) {
    complete(future)(
      pipe(
        i === 0 ? second.interruptAs(first.id) : first.interruptAs(second.id),
        flatMap(() =>
          fromExit<E | E2, Either.Either<A, B>>(
            pipe(
              exit as Exit.Exit<E | E2, A | B>,
              Exit.map((ab) => (i === 0 ? Either.Left(ab as A) : Either.Right(ab as B))),
            ),
          ),
        ),
      ),
    )
  }

  first.addObserver((exit) => onExit(exit, 0))
  second.addObserver((exit) => onExit(exit, 1))

  return wait(future)
}
