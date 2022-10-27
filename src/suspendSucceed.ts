import { Fx } from './Fx.js'

export function suspendSucceed<R, E, A>(f: () => Fx<R, E, A>): Fx<R, E, A> {
  return Fx((emitter) => f().run(emitter))
}
