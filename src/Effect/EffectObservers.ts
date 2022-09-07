import { Disposable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'

export class EffectObservers<E, A> {
  protected _observers: Array<Observer<E, A>> = []

  isNonEmpty() {
    return this._observers.length > 0
  }

  addObserver(observer: Observer<E, A>) {
    this._observers.push(observer)

    return Disposable(() => {
      const i = this._observers.indexOf(observer)

      if (i > -1) {
        this._observers.splice(i, 1)
      }
    })
  }

  notifyExit(exit: Exit<E, A>) {
    this._observers.forEach((observer) => observer(exit))
    this._observers = []
  }
}

export interface Observer<E, A> {
  (exit: Exit<E, A>): void
}
