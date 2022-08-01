import { Eff } from './Eff.js'

import { StrictExclude } from '@/internal.js'

export class Access<R, Y, R2> extends Eff.Instruction<(resources: R) => Eff<Y, R2>, R2> {
  readonly tag = 'Access'
}

export function access<R, Y, R2>(
  f: (resources: R) => Eff<Y, R2>,
  __trace?: string,
): Eff<Y | Access<R, Y, R2>, R2> {
  return new Access(f, __trace)
}

export class Provide<Y, R, R2> extends Eff.Instruction<
  readonly [eff: Eff<Y, R>, resources: R2],
  R
> {
  readonly tag = 'Provide'
}

type AnyAccess<R> =
  | Access<R, any, any>
  | Access<R, never, never>
  | Access<R, never, any>
  | Access<R, any, never>

export const provide =
  <R2>(resources: R2, __trace?: string) =>
  <Y, R>(eff: Eff<Y, R>): Eff<StrictExclude<Y, AnyAccess<R2>> | Provide<Y, R, R2>, R> =>
    new Provide([eff, resources], __trace)
