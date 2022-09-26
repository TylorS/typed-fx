import { flow } from 'hkt-ts'

import { Sink, addTrace } from './Sink.js'

import { Fx, flatMap } from '@/Fx/Fx.js'

export function local<B, A>(f: (b: B) => A, __trace?: string) {
  return <E, R2, E2>(sink: Sink<E, A, R2, E2>): Sink<E, B, R2, E2> =>
    addTrace(
      {
        ...sink,
        event: flow(f, sink.event),
      },
      __trace,
    )
}

export function localFx<B, R3, E3, A>(f: (b: B) => Fx<R3, E3, A>, __trace?: string) {
  return <E, R2, E2>(sink: Sink<E, A, R2, E2>): Sink<E, B, R2 | R3, E2 | E3> =>
    addTrace(
      {
        ...sink,
        event: flow(f, flatMap(sink.event)),
      },
      __trace,
    )
}
