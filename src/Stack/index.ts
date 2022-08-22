import * as Assoc from 'hkt-ts/Typeclass/Associative'
import * as E from 'hkt-ts/Typeclass/Eq'
import { Identity } from 'hkt-ts/Typeclass/Identity'

export class Stack<A> {
  constructor(readonly value: A, readonly previous: Stack<A> | null = null) {}

  readonly push = (value: A): Stack<A> => new Stack(value, this)
  readonly pop = (): Stack<A> | null => this.previous
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
  const eq: E.Eq<Stack<A>> = E.struct({
    value: A,
    previous: E.nullable(E.lazy(() => eq)),
  })

  return eq
}

export const join =
  <A>(AssocA: Assoc.Associative<A>) =>
  (second: Stack<A>) =>
  (first: Stack<A>): Stack<A> =>
    new Stack(
      AssocA.concat(first.value, second.value),
      first.previous === null
        ? second.previous
        : second.previous === null
        ? first.previous
        : join(AssocA)(second.previous)(first.previous),
    )

export const makeAssociative = <A>(AssocA: Assoc.Associative<A>): Assoc.Associative<Stack<A>> => ({
  concat: (f, s) => join(AssocA)(f)(s),
})

// takes an Identity<A> and returns an Identity<Stack<A>>
export const makeIdentity = <A>(I: Identity<A>): Identity<Stack<A>> => ({
  ...makeAssociative(I),
  id: new Stack(I.id),
})
