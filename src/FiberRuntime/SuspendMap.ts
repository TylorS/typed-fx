import { RuntimeIterable } from './RuntimeIterable'

export class SuspendMap<E> {
  #supsended = new Set<symbol>()
  #resumed = new Map<symbol, (iterable: RuntimeIterable<E, any>) => void>()
  #iterables = new Map<symbol, RuntimeIterable<E, any>>()

  readonly suspend = (): readonly [symbol, (iterable: RuntimeIterable<E, any>) => void] => {
    const id = Symbol()

    this.#supsended.add(id)

    return [
      id,
      (i: RuntimeIterable<E, any>) => {
        this.#supsended.delete(id)

        const resume = this.#resumed.get(id)

        if (resume) {
          resume(i)
          this.#resumed.delete(id)
        } else {
          this.#iterables.set(id, i)
        }
      },
    ] as const
  }

  readonly resume = (id: symbol, f: (iterable: RuntimeIterable<E, any>) => void) => {
    const suspended = this.#supsended.has(id)

    if (suspended) {
      this.#resumed.set(id, f)

      return false
    }

    const iterable = this.#iterables.get(id)

    if (iterable) {
      f(iterable)

      return true
    }

    throw new Error(
      `Unable to find suspended Fx. If you're programming to the FiberRuntime, be sure to understand the lifecycle of Suspend/Resume.`,
    )
  }
}
