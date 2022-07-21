import { Exit } from '@/Exit/Exit'

export class SuspendMap<E> {
  #supsended = new Set<symbol>()
  #resumed = new Map<symbol, (iterable: Exit<E, any>) => void>()
  #exits = new Map<symbol, Exit<E, any>>()

  readonly suspend = (): readonly [symbol, (iterable: Exit<E, any>) => void] => {
    const id = Symbol()

    this.#supsended.add(id)

    return [
      id,
      (exit: Exit<E, any>) => {
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

  readonly resume = (id: symbol, f: (exit: Exit<E, any>) => void) => {
    const suspended = this.#supsended.has(id)

    if (suspended) {
      this.#resumed.set(id, f)

      return false
    }

    const iterable = this.#exits.get(id)

    if (iterable) {
      f(iterable)

      return true
    }

    throw new Error(
      `Unable to find suspended Fx. If you're programming to the FiberRuntime, be sure to understand the lifecycle of Suspend/Resume.`,
    )
  }
}
