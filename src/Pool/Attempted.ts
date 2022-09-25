import { isLeft, match } from 'hkt-ts/Either'
import { pipe } from 'hkt-ts/function'

import { Exit } from '@/Exit/index.js'
import { Fx, Of, now, tap } from '@/Fx/index.js'

export class Attempted<E, A> {
  constructor(readonly exit: Exit<E, A>, readonly release: Of<void>) {}

  get failed() {
    return isLeft(this.exit)
  }

  with = <R2, E2, B>(f: (a: A) => Fx<R2, E2, B>): Fx<R2, E2, void> =>
    pipe(
      this.exit,
      match(
        () => now<void>(undefined),
        (a) =>
          pipe(
            now<void>(undefined),
            tap(() => f(a)),
          ),
      ),
    )
}
