import { pipe } from 'hkt-ts'
import { Either, isLeft } from 'hkt-ts/Either'

import { Fx, flatMap, now } from './Fx.js'

export function flatRec<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, Either<A, B>>) {
  return (a: A): Fx<R2, E2, B> =>
    pipe(
      f(a),
      flatMap((e) => (isLeft(e) ? flatRec(f)(e.left) : now(e.right))),
    )
}
