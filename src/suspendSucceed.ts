import { Fx } from './Fx.js'

export function suspendSucceed<R, E, A, E1>(f: () => Fx<R, E, A, E1>): Fx<R, E, A, E1> {
  let memoed: Fx<R, E, A, E1> | undefined
  const get = () => {
    if (memoed === undefined) {
      memoed = f()
    }
    return memoed
  }

  return Fx((sink) => get().run(sink))
}
