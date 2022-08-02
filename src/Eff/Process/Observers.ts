import { Just, Maybe, Nothing, isJust } from 'hkt-ts/Maybe'

import { Disposable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'

export class Observers<E, A> {
  protected observers = new Set<Observer<E, A>>()
  protected exit: Maybe<Exit<E, A>> = Nothing

  readonly addObserver = (observer: Observer<E, A>): Disposable => {
    if (isJust(this.exit)) {
      observer(this.exit.value)

      return Disposable.None
    }

    this.observers.add(observer)

    return Disposable(() => this.observers.delete(observer))
  }

  readonly notify = (exit: Exit<E, A>) => {
    this.exit = Just(exit)
    this.observers.forEach((o) => o(exit))
    this.observers.clear()
  }

  readonly clear = () => {
    this.observers.clear()
  }
}

export type Observer<E, A> = (exit: Exit<E, A>) => void
