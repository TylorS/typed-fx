import { Cause } from '@/Cause/Cause.js'
import { Fx, fromCause, fromLazy, unit } from '@/Fx/Fx.js'

export interface Sink<E, A, R2, E2, B> {
  readonly event: (a: A) => Fx<R2, E2, unknown>
  readonly error: (cause: Cause<E>) => Fx<R2, E2, B>
  readonly end: Fx<R2, E2, B>
}

export class Drain<E, A, R2, E2, B> implements Sink<E, A, R2, E | E2, B> {
  constructor(readonly end: Sink<E, A, R2, E | E2, B>['end']) {}

  readonly event: Sink<E, A, R2, E | E2, B>['event'] = () => unit
  readonly error: Sink<E, A, R2, E | E2, B>['error'] = fromCause
}

export class Reduce<E, A, B> extends Drain<E, A, never, E, B> {
  protected current = this.seed

  constructor(readonly seed: B, readonly f: (b: B, a: A) => B) {
    super(fromLazy(() => this.current))
  }

  readonly event = (a: A) =>
    fromLazy(() => {
      const { current, f } = this

      this.current = f(current, a)
    })
}
