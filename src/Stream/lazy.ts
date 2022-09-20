import { Stream } from './Stream.js'

export function lazy<R, E, A>(f: () => Stream<R, E, A>): Stream<R, E, A> {
  return Stream((sink, scheduler, context) => f().fork(sink, scheduler, context))
}
