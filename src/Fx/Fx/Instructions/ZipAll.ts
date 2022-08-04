import type { AnyFx, ErrorsOf, OutputOf, ResourcesOf } from '../Fx.js'

import { Eff } from '@/Eff/Eff.js'

export class ZipAll<FX extends ReadonlyArray<AnyFx>> extends Eff.Instruction<
  FX,
  {
    readonly [K in keyof FX]: OutputOf<FX[K]>
  }
> {
  readonly tag = 'ZipAll'

  readonly __R?: () => ResourcesOf<FX[number]>
  readonly __E?: () => ErrorsOf<FX[number]>
  readonly __A?: () => {
    readonly [K in keyof FX]: OutputOf<FX[K]>
  }
}
