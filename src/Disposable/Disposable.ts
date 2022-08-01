import { constVoid } from 'hkt-ts'

/**
 * A Synchronous representation of a Resource that can be disposed of or cancelled.
 */
export interface Disposable {
  readonly dispose: () => void
}

export function Disposable(dispose: () => void): Disposable {
  return {
    dispose,
  }
}

export const None: Disposable = {
  dispose: constVoid,
}

Disposable.None = None

export function all(...disposables: readonly Disposable[]): Disposable {
  return Disposable(() => disposables.forEach((d) => d.dispose()))
}

export interface Settable extends Disposable {
  readonly isDisposed: () => boolean
  readonly add: (disposable: Disposable) => Disposable
}

export function settable(): Settable {
  const disposables = new Set<Disposable>()

  let disposed = false
  const add = (d: Disposable) => {
    if (disposed) {
      d.dispose()

      return None
    }

    disposables.add(d)

    return Disposable(() => disposables.delete(d))
  }

  const dispose = () => {
    disposed = true

    const disposable = all(...Array.from(disposables))
    disposables.clear()
    disposable.dispose()
  }

  return {
    dispose,
    isDisposed: () => disposed,
    add,
  }
}
