import { Push } from './Push.js'

export function suspendSucceed<R, E, A>(f: () => Push<R, E, A>): Push<R, E, A> {
  return Push((emitter) => f().run(emitter))
}
