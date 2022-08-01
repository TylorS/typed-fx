import { pipe } from 'hkt-ts'
import { Endomorphism } from 'hkt-ts/Endomorphism'
import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'
import { Associative, First } from 'hkt-ts/Typeclass/Associative'
import { Eq } from 'hkt-ts/Typeclass/Eq'
import { Identity } from 'hkt-ts/Typeclass/Identity'

/**
 * Atomic represents an a mutable reference to immutable data
 * that can be modified and joined back together.
 */
export interface Atomic<A> extends Identity<A> {
  readonly get: () => A
  readonly modify: <B>(f: (a: A) => readonly [B, A]) => B
}

/**
 * Construct an Atomic with an initial value, and optionally an Associative instance.
 */
export function Atomic<A>(initial: A, A: Associative<A> = First): Atomic<A> {
  let current = initial

  return {
    id: initial,
    concat: A.concat,
    get: () => current,
    modify: (f) => {
      const [b, a] = f(current)
      current = a
      return b
    },
  }
}

/**
 * Get the current value of an Atomic
 */
export function get<A>(atomic: Atomic<A>): A {
  return atomic.get()
}

/**
 * Atomically view and update the state of an Atomic.
 */
export function modify<A, B>(f: (a: A) => readonly [B, A]) {
  return (atomic: Atomic<A>): B => atomic.modify(f)
}

/**
 * Set the value of Atomic but return the previous state.
 */
export const getAndSet =
  <A>(updated: A) =>
  (atomic: Atomic<A>): A =>
    atomic.modify((a) => [a, updated])

/**
 * Set the state of an Atomic and return that value.
 */
export const set =
  <A>(updated: A) =>
  (atomic: Atomic<A>): A =>
    atomic.modify(() => [updated, updated])

/**
 * Apply an Endomorphism to update the current state of an Atomic.
 */
export const update =
  <A>(f: Endomorphism<A>) =>
  (atomic: Atomic<A>): A =>
    atomic.modify((a) => {
      const updated = f(a)

      return [updated, updated]
    })

/**
 * Apply an Endomorphism to update the current state of an Atomic, but
 * return the previous state.
 */
export const getAndUpdate =
  <A>(f: Endomorphism<A>) =>
  (atomic: Atomic<A>): A =>
    atomic.modify((a) => {
      const updated = f(a)

      return [a, updated]
    })

/**
 * Join together the values contained within 2 Atomics.
 */
export function join<A>(second: Atomic<A>) {
  return (first: Atomic<A>): A =>
    pipe(
      first,
      update((a) => first.concat(a, second.get())),
    )
}

/**
 * Using an Eq instance, compare the expected current value with
 * the actual value contained within an Atomic and update the Atomic
 * with the updated value. If the expected current value does not match
 * the existing value, a `Maybe.Nothing` is returned.
 */
export function compareAndSwap<A>(E: Eq<A>) {
  return (current: A, updated: A) =>
    (atomic: Atomic<A>): Maybe<A> => {
      if (E.equals(atomic.get(), current)) {
        return pipe(atomic, set(updated), Just)
      }

      return Nothing
    }
}
