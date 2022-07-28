import type { AnyFx, ErrorsOf, Fx, OutputOf, ResourcesOf } from '../Fx.js'

import { Eff } from '@/Fx/Eff/Eff.js'

export class ZipAll<R, E, A> extends Eff.Instruction<ReadonlyArray<Fx<R, E, any>>, A> {}

export const zipAll = <FX extends ReadonlyArray<AnyFx>>(
  fx: readonly [...FX],
  __trace?: string,
): Fx<
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  {
    readonly [K in keyof FX]: OutputOf<FX[K]>
  }
> => new ZipAll(fx, __trace)
