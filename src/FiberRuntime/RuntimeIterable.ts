import { RuntimeInstruction } from './RuntimeInstruction'

export interface RuntimeIterable<E, A> {
  readonly [Symbol.iterator]: () => Generator<RuntimeInstruction<E>, A, any>
}
