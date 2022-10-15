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
  return new SettableDisposable()
}

class SettableDisposable implements Settable {
  protected disposables = new Set<Disposable>()
  protected disposed = false

  readonly isDisposed = () => this.disposed

  readonly add = (d: Disposable) => {
    if (d === None) {
      return d
    }

    if (this.disposed) {
      d.dispose()

      return None
    }

    this.disposables.add(d)

    return Disposable(() => this.disposables.delete(d))
  }

  readonly dispose = () => {
    this.disposed = true
    const disposable = all(...Array.from(this.disposables))
    this.disposables.clear()
    disposable.dispose()
  }
}
