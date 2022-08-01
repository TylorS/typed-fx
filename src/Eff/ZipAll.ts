import { Eff, ReturnOf, YieldOf } from './Eff.js'

export class ZipAll<Effs extends ReadonlyArray<Eff.AnyEff>> extends Eff.Instruction<
  Effs,
  {
    readonly [K in keyof Effs]: ReturnOf<Effs[K]>
  }
> {
  readonly tag = 'ZipAll'
}

export const zipAll = <Effs extends ReadonlyArray<Eff.AnyEff>>(
  effs: Effs,
  __trace?: string,
): Eff<
  ZipAll<Effs> | YieldOf<Effs[number]>,
  {
    readonly [K in keyof Effs]: ReturnOf<Effs[K]>
  }
> => new ZipAll(effs, __trace)
