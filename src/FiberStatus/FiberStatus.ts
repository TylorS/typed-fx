import { Exit } from '@/Exit/Exit'
import { FiberId } from '@/FiberId/FiberId'

export type FiberStatus<E, A> =
  | FiberStatus.Suspended<E, A>
  | FiberStatus.Running<E, A>
  | FiberStatus.Exited<E, A>

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace FiberStatus {
  export type Observer<E, A> = (exit: Exit<E, A>) => void
  export type Observers<E, A> = ReadonlySet<Observer<E, A>>

  export class Suspended<E, A> {
    static tag = 'Suspended' as const
    readonly tag = Suspended.tag

    constructor(readonly fiberId: FiberId, readonly observers: Observers<E, A>) {}

    readonly addObserver = (observer: Observer<E, A>) =>
      new Suspended(this.fiberId, new Set([...this.observers, observer]))

    readonly removeObserver = (observer: Observer<E, A>) => {
      const updated = new Set(this.observers)

      updated.delete(observer)

      return new Suspended(this.fiberId, updated)
    }

    readonly running = () => new Running(this.fiberId, this.observers)
  }

  export class Running<E, A> {
    static tag = 'Running' as const
    readonly tag = Running.tag

    constructor(readonly fiberId: FiberId, readonly observers: Observers<E, A>) {}

    readonly addObserver = (observer: Observer<E, A>) =>
      new Running(this.fiberId, new Set([...this.observers, observer]))

    readonly removeObserver = (observer: Observer<E, A>) => {
      const updated = new Set(this.observers)

      updated.delete(observer)

      return new Running(this.fiberId, updated)
    }

    readonly suspended = () => new Suspended(this.fiberId, this.observers)
  }

  export class Exited<out E, out A> {
    static tag = 'Exited' as const
    readonly tag = Exited.tag

    constructor(readonly fiberId: FiberId, readonly exit: Exit<E, A>) {}
  }

  export function removeObserver<E, A>(observer: Observer<E, A>) {
    return (status: FiberStatus<E, A>): FiberStatus<E, A> => {
      switch (status.tag) {
        case Exited.tag:
          return status
        default:
          return status.removeObserver(observer)
      }
    }
  }

  export function addObserver<E, A>(observer: Observer<E, A>) {
    return (status: FiberStatus<E, A>): FiberStatus<E, A> => {
      switch (status.tag) {
        case Exited.tag:
          return status
        default:
          return status.addObserver(observer)
      }
    }
  }
}
