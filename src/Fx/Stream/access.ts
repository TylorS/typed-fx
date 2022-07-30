import { Env } from '../Env/Env.js'
import * as Fx from '../Fx/Fx.js'

import { Stream } from './Stream.js'

export function access<R, R2, E, A>(f: (env: Env<R>) => Stream<R2, E, A>): Stream<R | R2, E, A> {
  return new Stream((sink, context) => Fx.access((env) => f(env).fork(sink, context)))
}
