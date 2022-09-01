import { Left, Right } from 'hkt-ts/Either'
import * as Maybe from 'hkt-ts/Maybe'

import { IO } from './IO.js'
import { CauseFrame, ExitFrame, IOFrame, MapFrame, ValueFrame } from './IOFrame.js'
import { addObserver } from './IOFuture.js'
import { IORefs } from './IORefs.js'

import * as Cause from '@/Cause/Cause.js'
import { Disposable, Settable, settable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'

export class IORuntime<E, A> {
  protected _instr: Maybe.Maybe<IO<any, any>> = Maybe.Just(this.io)
  protected _observers: Array<(exit: Exit<E, A>) => void> = []
  protected _stackFrames: Array<IOFrame> = []
  protected _disposable: Maybe.Maybe<Settable> = Maybe.Nothing

  constructor(readonly io: IO<E, A>, readonly ioRefs: IORefs) {}

  readonly addObserver = (observer: (exit: Exit<E, A>) => void): Disposable => {
    this._observers.push(observer)

    return Disposable(() => {
      this._observers.splice(this._observers.indexOf(observer), 1)
    })
  }

  public run() {
    try {
      this.loop()
    } catch (e) {
      this.continueWithCause(Cause.unexpected(e))
    }
  }

  protected loop() {
    while (Maybe.isJust(this._instr)) {
      ;(this[this._instr.value.tag] as (i: IO<any, any>) => void)(this._instr.value)
    }
  }

  protected continueWith(a: any): void {
    let frame = this._stackFrames.pop()

    while (frame) {
      const tag = frame.tag
      if (tag === 'Value') {
        this._instr = Maybe.Just(frame.f(a))
        return
      } else if (tag === 'Exit') {
        this._instr = Maybe.Just(frame.f(Right(a)))
        return
      } else if (tag === 'Map') {
        a = frame.f(a)
      }

      frame = this._stackFrames.pop()
    }

    return this.done(Right(a))
  }

  protected continueWithCause(a: Cause.Cause<any>): void {
    let frame = this._stackFrames.pop()

    while (frame) {
      const tag = frame.tag

      if (tag === 'Cause') {
        this._instr = Maybe.Just(frame.f(a))
        return
      }

      if (tag === 'Exit') {
        this._instr = Maybe.Just(frame.f(Left(a)))
        return
      }

      frame = this._stackFrames.pop()
    }

    this.done(Left(a))
  }

  protected done(exit: Exit<any, any>) {
    this._observers.forEach((o) => o(exit))
    this._observers.length = 0
    this._instr = Maybe.Nothing

    if (this._disposable.tag === 'Just') {
      this._disposable.value.dispose()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected GetIORefs(_: Extract<IO<any, any>, { readonly tag: 'GetIORefs' }>) {
    this.continueWith(this.ioRefs)
  }

  protected Now(instr: Extract<IO<any, any>, { readonly tag: 'Now' }>) {
    this.continueWith(instr.input)
  }

  protected FromLazy(instr: Extract<IO<any, any>, { readonly tag: 'FromLazy' }>) {
    this.continueWith(instr.input())
  }

  protected LazyIO(instr: Extract<IO<any, any>, { readonly tag: 'LazyIO' }>) {
    this._instr = Maybe.Just(instr.input())
  }

  protected FromCause(instr: Extract<IO<any, any>, { readonly tag: 'FromCause' }>) {
    this.continueWithCause(instr.input)
  }

  protected MapIO(instr: Extract<IO<any, any>, { readonly tag: 'MapIO' }>) {
    const [io, f] = instr.input
    this._stackFrames.push(new MapFrame(f))
    this._instr = Maybe.Just(io)
  }

  protected FlatMapIO(instr: Extract<IO<any, any>, { readonly tag: 'FlatMapIO' }>) {
    const [io, f] = instr.input
    this._stackFrames.push(new ValueFrame(f))
    this._instr = Maybe.Just(io)
  }

  protected OrElseIO(instr: Extract<IO<any, any>, { readonly tag: 'OrElseIO' }>) {
    const [io, f] = instr.input
    this._stackFrames.push(new CauseFrame(f))
    this._instr = Maybe.Just(io)
  }

  protected AttemptIO(instr: Extract<IO<any, any>, { readonly tag: 'AttemptIO' }>) {
    const [io, f] = instr.input
    this._stackFrames.push(new ExitFrame(f))
    this._instr = Maybe.Just(io)
  }

  protected WaitIO(instr: Extract<IO<any, any>, { readonly tag: 'WaitIO' }>) {
    const future = instr.input
    const state = future.state.get()

    if (state.tag === 'Resolved') {
      this._instr = Maybe.Just(state.io)
    } else {
      this._instr = Maybe.Nothing
      const inner = settable()
      inner.add(
        addObserver(future, (io) => {
          inner.dispose()
          this._instr = Maybe.Just(io)
          this.run()
        }),
      )
      inner.add(this.addDisposable(inner))
    }
  }

  protected addDisposable(disposable: Disposable) {
    if (this._disposable.tag === 'Nothing') {
      const d = settable()

      this._disposable = Maybe.Just(d)

      return d.add(disposable)
    } else {
      return this._disposable.value.add(disposable)
    }
  }
}
