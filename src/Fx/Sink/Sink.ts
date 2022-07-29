import { Cause } from '../Cause/Cause.js'

import { Of } from '@/Fx/Fx/Fx.js'

export interface Sink<E, A> {
  readonly event: (a: A) => Of<unknown>
  readonly error: (cause: Cause<E>) => Of<unknown>
  readonly end: Of<unknown>
}
