import { Sink, addTrace } from './Sink.js'

import { Fx } from '@/Fx/Fx.js'

export function onEnd<R3, E3, B>(fx: Fx<R3, E3, B>, __trace?: string) {
  return <E, A, R2, E2>(sink: Sink<E, A, R2, E2>): Sink<E, A, R2 | R3, E2 | E3> =>
    addTrace<E, A, R2 | R3, E2 | E3>(
      {
        event: sink.event,
        error: sink.error,
        end: fx,
      },
      __trace,
    )
}
