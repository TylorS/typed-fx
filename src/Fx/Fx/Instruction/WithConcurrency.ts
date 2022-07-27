import { NonNegativeInteger } from 'hkt-ts/number'

import { Eff } from '@/Fx/Eff/Eff.js'
import { Fx } from '@/Fx/Fx/Fx.js'

export class WithConcurrency<R, E, A> extends Eff.Instruction<
  readonly [fx: Fx<R, E, A>, concurrencyLevel: NonNegativeInteger],
  A
> {}

export const withConcurrency =
  (concurrencyLevel: NonNegativeInteger, __trace?: string) =>
  <R, E, A>(fx: Fx<R, E, A>) =>
    new WithConcurrency([fx, concurrencyLevel], __trace)
