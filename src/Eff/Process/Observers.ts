import { Just, Maybe, Nothing, isJust, isNothing } from 'hkt-ts/Maybe'

import { Disposable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'

export class Observers<E, A> {
  protected observers = new Set<Observer<E, A>>()
  protected exit: Maybe<Exit<E, A>> = Nothing

  constructor(readonly memoize: boolean) {}

  readonly addObserver = (observer: Observer<E, A>): Disposable => {
    if (this.memoize && isJust(this.exit)) {
      observer(this.exit.value)

      return Disposable.None
    }

    this.observers.add(observer)

    return Disposable(() => this.observers.delete(observer))
  }

  readonly notify = (exit: Exit<E, A>) => {
    if (this.memoize && isNothing(this.exit)) {
      this.exit = Just(exit)
    }

    const toSend = this.memoize ? (this.exit as Just<Exit<E, A>>).value : exit

    this.observers.forEach((o) => {
      o(toSend)
    })
    this.observers.clear()
  }

  readonly clear = () => {
    this.observers.clear()
  }
}

export type Observer<E, A> = (exit: Exit<E, A>) => void
