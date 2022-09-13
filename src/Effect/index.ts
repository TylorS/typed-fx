import { Cause } from '@/Cause/index.js'

export type Effect<R, E, A> = Now<A> | FromCause<E> | Yield<R> | Resume<A>

export interface Now<A> {
  readonly tag: 'Now'
  readonly value: A
}

export interface FromCause<E> {
  readonly tag: 'FromCause'
  readonly cause: Cause<E>
}

export interface Yield<R> {
  readonly tag: 'Yield'
  readonly yielded: R
}

export interface Resume<A> {
  readonly tag: 'Resume'
  readonly value: A
}
