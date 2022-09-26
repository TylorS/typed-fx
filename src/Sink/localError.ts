import { flow } from 'hkt-ts'

import { Sink, addTrace } from './Sink.js'

import * as Cause from '@/Cause/index.js'
import { Fx, flatMap } from '@/Fx/Fx.js'

export function localError<E2, E1>(f: (e: Cause.Cause<E2>) => Cause.Cause<E1>, __trace?: string) {
  return <A, R2, E3>(sink: Sink<E1, A, R2, E3>): Sink<E2, A, R2, E3> =>
    addTrace(
      {
        ...sink,
        error: flow(f, sink.error),
      },
      __trace,
    )
}

export function localErrorFx<E2, R3, E4, E1>(
  f: (e: Cause.Cause<E2>) => Fx<R3, E4, Cause.Cause<E1>>,
  __trace?: string,
) {
  return <A, R2, E3>(sink: Sink<E1, A, R2, E3>): Sink<E2, A, R2 | R3, E3 | E4> =>
    addTrace(
      {
        ...sink,
        error: flow(f, flatMap(sink.error)),
      },
      __trace,
    )
}
