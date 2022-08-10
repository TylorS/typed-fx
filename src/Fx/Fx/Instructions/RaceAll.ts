import type { AnyFx, ErrorsOf, OutputOf, ResourcesOf } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

export class RaceAll<FX extends ReadonlyArray<AnyFx>> extends FxInstruction<
  FX,
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  OutputOf<FX[number]>
> {
  readonly tag = 'RaceAll'
}
