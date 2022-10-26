import { flow } from '@fp-ts/data/Function'

import { Emitter, Push } from './Push.js'

export const map =
  <A, B>(f: (a: A) => B) =>
  <R, E>(push: Push<R, E, A>): Push<R, E, B> =>
    Push((emitter) => push.run(Emitter(flow(f, emitter.emit), emitter.failCause, emitter.end)))

export const as = <B>(value: B): (<R, E, A>(push: Push<R, E, A>) => Push<R, E, B>) =>
  map(() => value)
