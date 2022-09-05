import { pipe } from 'hkt-ts'
import { NonEmptyArray, map } from 'hkt-ts/NonEmptyArray'
import * as Assoc from 'hkt-ts/Typeclass/Associative'
import * as E from 'hkt-ts/Typeclass/Eq'
import { Identity } from 'hkt-ts/Typeclass/Identity'

export class Stack<A> {
  constructor(readonly value: A, readonly previous: Stack<A> | null = null) {}

  public push(value: A): Stack<A> {
    return new Stack(value, this)
  }

  public pop(): Stack<A> | null {
    return this.previous
  }

  public replace(f: (value: A) => A): Stack<A> {
    return new Stack(f(this.value), this.previous)
  }

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

export function toNonEmptyArray<A>(stack: Stack<A>): NonEmptyArray<A> {
  return Array.from(stack) as any
}

export function fromNonEmptyArray<A>(a: NonEmptyArray<A>): Stack<A> {
  return a
    .slice(0, a.length - 1)
    .reduceRight((prev, a) => new Stack(a, prev), new Stack(a[a.length - 1]))
}

export const join =
  <A>(AssocA: Assoc.Associative<A>) =>
  (second: Stack<A>) =>
  (first: Stack<A>): Stack<A> => {
    const f = toNonEmptyArray(first)
    const fl = f.length
    const s = toNonEmptyArray(second)
    const sl = s.length

    if (fl === 0) {
      return second
    }

    if (sl === 0) {
      return first
    }

    // Fast-path for stacks that are equal in size
    if (fl === sl) {
      return pipe(
        f,
        map((a, i) => AssocA.concat(a, s[i])),
        fromNonEmptyArray,
      )
    }

    const hi = fl > sl ? f : s
    const lo = fl < sl ? s : f
    const diff = hi.length - lo.length
    const join = fl > sl ? AssocA.concat : Assoc.reverse(AssocA).concat
    const toPrepend = lo.slice(0, diff)
    const toConcat = hi.slice(diff)

    return fromNonEmptyArray([...toPrepend, ...toConcat.map((a, i) => join(a, lo[i]))] as any)
  }

export const makeAssociative = <A>(AssocA: Assoc.Associative<A>): Assoc.Associative<Stack<A>> => ({
  concat: (f, s) => join(AssocA)(f)(s),
})

// takes an Identity<A> and returns an Identity<Stack<A>>
export const makeIdentity = <A>(I: Identity<A>): Identity<Stack<A>> => ({
  ...makeAssociative(I),
  id: new Stack(I.id),
})
