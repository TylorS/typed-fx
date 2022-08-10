import type { AnyFx, ErrorsOf, OutputOf, ResourcesOf } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

export class ZipAll<FX extends ReadonlyArray<AnyFx>> extends FxInstruction<
  FX,
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  {
    readonly [K in keyof FX]: OutputOf<FX[K]>
  }
> {
  readonly tag = 'ZipAll'
}
