/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Fx } from '@/Fx/Fx'
import type { Service } from '@/Service/Service'
import type { InstanceOf } from '@/internal'

export abstract class BaseFxInstruction<R, E, A> {
  readonly _R!: () => R
  readonly _E!: () => E
  readonly _A!: () => A
}

export abstract class FxInstruction<I, R extends Service<any>, E, A>
  extends BaseFxInstruction<R, E, A>
  implements Fx<R, E, A>
{
  readonly name: string

  constructor(readonly input: I, readonly trace?: string) {
    super()
    this.name = this.constructor.name
  }

  *[Symbol.iterator](): Generator<this, A> {
    return (yield this) as A
  }

  readonly is = <S extends AnyInstructionConstructor>(s: S): this is InstanceOf<S> =>
    this.constructor === s

  readonly log = () => {
    return `${this.name} at ${this.trace}`
  }
}

export type AnyInstructionConstructor = {
  new (...args: any): FxInstruction<any, any, any, any>
}

export type ResourcesFromInstruction<T> = [T] extends [
  BaseFxInstruction<infer _R, infer _E, infer _A>,
]
  ? _R
  : never

export type ErrorsFromInstruction<T> = [T] extends [BaseFxInstruction<infer _R, infer _E, infer _A>]
  ? _E
  : never

export type OutputFromInstruction<T> = [T] extends [BaseFxInstruction<infer _R, infer _E, infer _A>]
  ? _A
  : never
