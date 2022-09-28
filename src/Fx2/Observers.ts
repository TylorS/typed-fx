import { Disposable } from '@/Disposable/Disposable.js'
import { Exit } from '@/Exit/Exit.js'

export class Observers<E, A> {
  protected observers: Observer<E, A>[] = []

  add(observer: Observer<E, A>): Disposable {
    this.observers.push(observer)

    return Disposable(() => {
      const index = this.observers.indexOf(observer)

      if (index > -1) {
        this.observers.splice(index, 1)
      }
    })
  }

  notify(exit: Exit<E, A>): void {
    this.observers.slice().forEach((observer) => observer(exit))
    this.observers = []
  }
}

export interface Observer<E, A> {
  (exit: Exit<E, A>): void
}
