import { Sink, addTrace } from './Sink.js'

import { Fx } from '@/Fx/Fx.js'

export function onEvent<A, R3, E3, B>(f: (a: A) => Fx<R3, E3, B>, __trace?: string) {
  return <E, B, R2, E2>(sink: Sink<E, B, R2, E2>): Sink<E, A, R2 | R3, E2 | E3> =>
    addTrace<E, A, R2 | R3, E2 | E3>(
      {
        ...sink,
        event: f,
      },
      __trace,
    )
}
