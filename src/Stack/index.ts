import { pipe } from 'hkt-ts'
import * as E from 'hkt-ts/Typeclass/Eq'

export class Stack<A> {
  constructor(readonly value: A, readonly previous?: Stack<A>) {}

  readonly push = (value: A): Stack<A> => new Stack(value, this)
  readonly pop = (): Stack<A> | undefined => this.previous
  readonly replace = (f: (value: A) => A): Stack<A> => new Stack(f(this.value), this.previous);

  *[Symbol.iterator]() {
    yield this.value

    let current = this.previous
    while (current) {
      yield current.value
      current = current.previous
    }
  }
}

export const makeEq = <A>(A: E.Eq<A>): E.Eq<Stack<A>> => {
  type StackDto<A> = {
    readonly value: A
    readonly previous: Stack<A> | null
  }

  const eq: E.Eq<Stack<A>> = pipe(
    E.struct<StackDto<A>>({
      value: A,
      previous: E.nullable(E.lazy(() => eq)),
    }),
    E.contramap((s: Stack<A>): StackDto<A> => ({ value: s.value, previous: s.previous ?? null })),
  )

  return eq
}
