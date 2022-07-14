import type { AnyFx, ErrorsOf, Fx, ResourcesOf } from '../Fx'

import { FxInstruction } from './FxInstruction'

export class ZipAll<FX extends ReadonlyArray<AnyFx>> extends FxInstruction<
  FX,
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  {
    readonly [K in keyof FX]: FX[K]
  }
> {}

export const zipAll = <FX extends ReadonlyArray<AnyFx>>(
  ...fx: FX
): Fx<
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  {
    readonly [K in keyof FX]: FX[K]
  }
> => new ZipAll(fx)
