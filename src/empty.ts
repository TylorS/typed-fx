import { Fx } from './Fx.js'

export function empty<A>(): Fx<unknown, never, A, never> {
  return Fx((sink) => sink.end)
}
