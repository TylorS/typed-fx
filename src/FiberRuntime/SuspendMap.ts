import { Just, Nothing } from 'hkt-ts/Maybe'

import { RuntimeIterable } from './RuntimeIterable'

export class SuspendMap<E> {
  #supsended = new Set<symbol>()
  #resumed = new Map<symbol, (iterable: RuntimeIterable<E, any>) => void>()
  #exits = new Map<symbol, RuntimeIterable<E, any>>()

  readonly suspend = (): readonly [symbol, (iterable: RuntimeIterable<E, any>) => void] => {
    const id = Symbol()

    this.#supsended.add(id)

    return [
      id,
      (exit: RuntimeIterable<E, any>) => {
        this.#supsended.delete(id)

        const resume = this.#resumed.get(id)

        if (resume) {
          resume(exit)
          this.#resumed.delete(id)
        } else {
          this.#exits.set(id, exit)
        }
      },
    ] as const
  }

  readonly resume = (id: symbol, f: (exit: RuntimeIterable<E, any>) => void) => {
    const suspended = this.#supsended.has(id)

    if (suspended) {
      this.#resumed.set(id, f)

      return Nothing
    }

    const iterable = this.#exits.get(id)

    if (iterable) {
      f(iterable)

      return Just(undefined)
    }

    throw new Error(
      `Unable to find suspended Fx. If you're programming to the FiberRuntime, be sure to understand the lifecycle of Suspend/Resume.`,
    )
  }
}
