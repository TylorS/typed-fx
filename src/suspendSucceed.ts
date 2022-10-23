import * as Effect from '@effect/core/io/Effect'

import { Fx } from './Fx.js'

export function suspendSucceed<R, E, A, E1>(f: () => Fx<R, E, A, E1>): Fx<R, E, A, E1> {
  return Fx((sink) => Effect.suspendSucceed(() => f().run(sink)))
}
