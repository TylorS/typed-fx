import { Stream } from './Stream.js'

export function empty<A>(): Stream<unknown, never, A, never> {
  return Stream((sink) => sink.end)
}
