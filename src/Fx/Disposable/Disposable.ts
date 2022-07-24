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
