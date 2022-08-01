import { Cause } from '../Cause/Cause.js'

import { IO } from '@/Fx/Fx/Fx.js'

export interface Sink<E, A> {
  readonly event: (a: A) => IO<E, unknown>
  readonly error: (cause: Cause<E>) => IO<E, unknown>
  readonly end: IO<E, unknown>
}
