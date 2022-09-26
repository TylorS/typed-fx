import { Stream } from './Stream.js'

export function lazy<R, E, A>(f: () => Stream<R, E, A>): Stream<R, E, A> {
  let memo: Stream<R, E, A> | undefined
  const get = () => {
    if (memo === undefined) {
      memo = f()
    }

    return memo
  }

  return Stream((sink) => get().fork(sink))
}
