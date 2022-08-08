import type { AnyFx, ErrorsOf, OutputOf, ResourcesOf } from '../Fx.js'

import { Eff } from '@/Eff/Eff.js'

export class RaceAll<FX extends ReadonlyArray<AnyFx>> extends Eff.Instruction<
  FX,
  OutputOf<FX[number]>
> {
  readonly tag = 'RaceAll'

  readonly __R?: () => ResourcesOf<FX[number]>
  readonly __E?: () => ErrorsOf<FX[number]>
  readonly __A?: () => OutputOf<FX[number]>
}
