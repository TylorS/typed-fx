import type { AnyFx, ErrorsOf, Fx, OutputOf, ResourcesOf } from '../Fx'

import { FxInstruction } from './FxInstruction'

export class ZipAll<FX extends ReadonlyArray<AnyFx>> extends FxInstruction<
  FX,
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  {
    readonly [K in keyof FX]: OutputOf<FX[K]>
  }
> {}

export const zipAll = <FX extends ReadonlyArray<AnyFx>>(
  ...fx: FX
): Fx<
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  {
    readonly [K in keyof FX]: OutputOf<FX[K]>
  }
> => new ZipAll(fx)
