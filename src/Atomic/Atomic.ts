import { Endomorphism } from 'hkt-ts/Endomorphism'
import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'
import { Eq } from 'hkt-ts/Typeclass/Eq'

export class Atomic<A> {
  #value: A

  constructor(readonly initial: A, readonly eq: Eq<A>) {
    this.#value = initial
  }

  readonly modify = <B>(f: (a: A) => readonly [B, A]) => {
    const [b, a] = f(this.#value)

    this.#value = a

    return b
  }

  readonly get = this.modify((a) => [a, a])

  readonly getAndSet = (updated: A) => this.modify((a) => [a, updated])

  readonly set = (updated: A) => this.modify(() => [updated, updated])

  readonly update = (f: Endomorphism<A>) =>
    this.modify((a) => {
      const updated = f(a)

      return [updated, updated]
    })

  readonly compareAndSwap: (current: A, updated: A) => Maybe<A> = (c, u) => {
    if (this.eq.equals(this.#value, c)) return Just(this.modify(() => [u, u]))

    return Nothing
  }
}
