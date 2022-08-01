/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Tagged is a module to help you construct Tagged types, which
 * are a means of creating nominal-like types in TypeScript.
 */

import { Constrain, HKT2, Params, Variance } from 'hkt-ts/HKT'
import type * as Associative from 'hkt-ts/Typeclass/Associative'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'
import type { Bounded } from 'hkt-ts/Typeclass/Bounded'
import type * as Commutative from 'hkt-ts/Typeclass/Commutative'
import type { Concat } from 'hkt-ts/Typeclass/Concat'
import * as C from 'hkt-ts/Typeclass/Covariant'
import type { Eq } from 'hkt-ts/Typeclass/Eq'
import type { Identity } from 'hkt-ts/Typeclass/Identity'
import type { Inverse } from 'hkt-ts/Typeclass/Inverse'
import type { Ord } from 'hkt-ts/Typeclass/Ord'
import type * as T from 'hkt-ts/Typeclass/Top'
import { unsafeCoerce } from 'hkt-ts/function'
import { M as B } from 'ts-toolbelt'

export const TAG = Symbol('@typed/fx/Tag')
export type TAG = typeof TAG

/**
 * Tag is encoded with as a Covariant type which allows for subtyping,
 * unlike Brand (from hkt-ts/Branded) which allows super-types via its Contravariant encoding of BRAND.
 */
export type Tag<T> = { readonly [TAG]: () => T }

/**
 * @category Type-level
 */
export type TagOf<A> = [A] extends [Tagged<infer Brand, infer _>] ? Brand : unknown

/**
 * @category Type-level
 */
export type ValueOf<A> = A extends Tagged<TagOf<A>, infer R> ? R : never

/**
 * @category Model
 */
export type Tagged<T, Type> = Type & Tag<T>

/**
 * @category Type-level
 */
export type Combine<T, U> = ValueOf<T> & ValueOf<U> & Tag<TagOf<T> & TagOf<U>>

/**
 * @category Constructor
 */
export const Tagged = <A extends Tagged<any, any>>() => {
  const constructor_ = <E extends ValueOf<A>>(e: E): Tagged<TagOf<A>, E> => unsafeCoerce(e)

  constructor_.makeEq = (A: Eq<ValueOf<A>>): Eq<A> => unsafeCoerce(A)

  constructor_.makeOrd = (A: Ord<ValueOf<A>>): Ord<A> => unsafeCoerce(A)

  constructor_.makeBounded = (A: Bounded<ValueOf<A>>): Bounded<A> => unsafeCoerce(A)

  constructor_.makeIdentity = (A: Identity<ValueOf<A>>): Identity<A> => unsafeCoerce(A)

  constructor_.makeConcat = (A: Concat<ValueOf<A>>): Concat<A> => unsafeCoerce(A)

  constructor_.makeAssociative = (
    A: Associative.Associative<ValueOf<A>>,
  ): Associative.Associative<A> => unsafeCoerce(A)

  constructor_.makeCommutative = (
    A: Commutative.Commutative<ValueOf<A>>,
  ): Commutative.Commutative<A> => unsafeCoerce(A)

  constructor_.makeInverse = (A: Inverse<ValueOf<A>>): Inverse<A> => unsafeCoerce(A)

  return constructor_
}

export const tag: <A extends Tagged<any, any>>(value: ValueOf<A>) => A = unsafeCoerce

export const untag: <A extends Tagged<any, any>>(value: A) => ValueOf<A> = unsafeCoerce

/**
 * Helper for removing all Branded values from a given type. Can be helpful for generating
 * an incoming type from a domain type.
 */
export type StripTagged<A> = A extends B.Primitive | Date
  ? ValueOf<A>
  : {
      readonly [K in keyof A]: StripTagged<A[K]>
    }

export interface TaggedHKT extends HKT2 {
  readonly type: Tagged<this[Params.E], this[Params.A]>
}

export const Covariant: C.Covariant2<TaggedHKT> = {
  map: (f) => (k) => unsafeCoerce(f(k)),
}

export const map = Covariant.map
export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const tupled = C.tupled(Covariant)
export const mapTo = C.mapTo(Covariant)

export const AssociativeBoth: AB.AssociativeBoth2<TaggedHKT> = {
  both: (s) => (f) => unsafeCoerce([f, s] as const),
}

export const both = AssociativeBoth.both
export const tuple = AB.tuple<TaggedHKT>({ ...AssociativeBoth, ...Covariant })

export const makeTop =
  <Tag>() =>
  <T>(
    value: T,
  ): T.Top2<
    Constrain<
      Constrain<TaggedHKT, Params.A, Variance.Invariant<T>>,
      Params.E,
      Variance.Contravariant<Tag>
    >
  > => ({
    top: unsafeCoerce(value),
  })
