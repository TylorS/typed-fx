import { Disposable } from '../Disposable/Disposable.js'
import { Exit } from '../Exit/Exit.js'

export class Observers<E, A> {
  protected observers = new Set<Observer<E, A>>()

  readonly addObserver = (observer: Observer<E, A>): Disposable => {
    this.observers.add(observer)

    return Disposable(() => this.observers.delete(observer))
  }

  readonly notify = (exit: Exit<E, A>) => {
    this.observers.forEach((o) => o(exit))
    this.observers.clear()
  }
}

export type Observer<E, A> = (exit: Exit<E, A>) => void
