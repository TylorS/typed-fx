import { Instruction } from './Instructions/Instruction.js'

import { Eff } from '@/Eff/Eff.js'
import { Service } from '@/Service/index.js'

export interface Sync<R, E, A> extends Eff<Instruction<R, E, any>, A> {}

export interface Env<in R> {
  readonly get: <S extends R>(service: Service<S>) => S
  readonly add: <S, I extends S>(service: Service<S>, impl: I) => Env<R | S>
}
