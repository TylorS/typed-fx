import * as Effect from '@effect/core/io/Effect'

import { Stream } from './Stream.js'

export function suspendSucceed<R, E, A, E1>(f: () => Stream<R, E, A, E1>): Stream<R, E, A, E1> {
  return Stream((sink) => Effect.suspendSucceed(() => f().run(sink)))
}
