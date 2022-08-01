import { NonNegativeInteger, NonNegativeIntegerAssociativeSum } from 'hkt-ts/number'

import { Atomic, getAndUpdate, update } from './Atomic.js'

export interface AtomicCounter extends Atomic<NonNegativeInteger> {}

export function AtomicCounter(): AtomicCounter {
  return Atomic(NonNegativeInteger<number>(0), NonNegativeIntegerAssociativeSum)
}

export const increment: (counter: AtomicCounter) => NonNegativeInteger = update(
  (n: NonNegativeInteger) => NonNegativeInteger(n + 1),
)
export const decrement: (counter: AtomicCounter) => NonNegativeInteger = update(
  (n: NonNegativeInteger) => NonNegativeInteger(Math.max(0, n - 1)),
)

export const getAndIncrement: (counter: AtomicCounter) => NonNegativeInteger = getAndUpdate(
  (n: NonNegativeInteger) => NonNegativeInteger(n + 1),
)
export const getAndDecrement: (counter: AtomicCounter) => NonNegativeInteger = getAndUpdate(
  (n: NonNegativeInteger) => NonNegativeInteger(Math.max(0, n - 1)),
)
