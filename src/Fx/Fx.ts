/* eslint-disable @typescript-eslint/no-unused-vars */

import { BaseFxInstruction } from './InstructionSet/FxInstruction'
import type {
  ErrorsFromInstruction,
  ResourcesFromInstruction,
} from './InstructionSet/FxInstruction'

import type { Service } from '@/Service/Service'

export interface Fx<out R extends Service<any>, out E, out A> {
  readonly [Symbol.iterator]: () => Generator<BaseFxInstruction<R, E, any>, A>
}

export type IO<E, A> = Fx<never, E, A>

export type Of<A> = Fx<never, never, A>

export type AnyFx = Fx<any, any, any> | Fx<any, never, any> | IO<any, any> | Of<any>

export type ResourcesOf<T> = [T] extends [Fx<infer _R, infer _E, infer _A>] ? _R : never

export type ErrorsOf<T> = [T] extends [Fx<infer _R, infer _E, infer _A>] ? _E : never

export type OutputOf<T> = [T] extends [Fx<infer _R, infer _E, infer _A>] ? _A : never

export function Fx<G extends AnyFxGenerator>(
  f: () => G,
): Fx<ResourcesFromGenerator<G>, ErrorsFromGenerator<G>, ReturnFromGenerator<G>> {
  return {
    [Symbol.iterator]: f,
  }
}

export type AnyFxGenerator<R = any> = Generator<BaseFxInstruction<any, any, any>, R>

export type ResourcesFromGenerator<T extends AnyFxGenerator> = T extends Generator<
  infer Y,
  infer _R
>
  ? ResourcesFromInstruction<Y>
  : never

export type ErrorsFromGenerator<T extends AnyFxGenerator> = T extends Generator<infer Y, infer _R>
  ? ErrorsFromInstruction<Y>
  : never

export type ReturnFromGenerator<T extends AnyFxGenerator> = T extends Generator<infer _Y, infer _R>
  ? _R
  : never
