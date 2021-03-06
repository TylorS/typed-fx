import { identity } from 'hkt-ts'
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

  get get() {
    return this.modify((a) => [a, a])
  }

  readonly getAndSet = (updated: A) => this.modify((a) => [a, updated])

  readonly set = (updated: A) => this.modify(() => [updated, updated])

  readonly update = (f: Endomorphism<A>) =>
    this.modify((a) => {
      const updated = f(a)

      return [updated, updated]
    })

  readonly getAndUpdate = (f: Endomorphism<A>) =>
    this.modify((a) => {
      const updated = f(a)

      return [a, updated]
    })

  readonly fork = (f: Endomorphism<A> = identity): Atomic<A> => new Atomic(f(this.#value), this.eq)

  readonly compareAndSwap: (current: A, updated: A) => Maybe<A> = (c, u) => {
    if (this.eq.equals(this.#value, c)) return Just(this.set(u))

    return Nothing
  }

  readonly toReadonly = () => new ReadonlyAtomic<A>(this)
}

export class ReadonlyAtomic<A> {
  constructor(readonly atomic: Atomic<A>) {}

  get get() {
    return this.atomic.get
  }

  readonly fork = (f?: Endomorphism<A>): Atomic<A> => this.atomic.fork(f)
}
