import { Sink, addTrace } from './Sink.js'

import { Cause } from '@/Cause/Cause.js'
import { Fx } from '@/Fx/Fx.js'

export function onError<E, R3, E3, B>(f: (cause: Cause<E>) => Fx<R3, E3, B>, __trace?: string) {
  return <A, E1, R2, E2>(sink: Sink<E1, A, R2, E2>): Sink<E, A, R2 | R3, E2 | E3> =>
    addTrace<E, A, R2 | R3, E2 | E3>(
      {
        ...sink,
        error: f,
      },
      __trace,
    )
}
