import type { AnyFx, ErrorsOf, OutputOf, ResourcesOf } from '../Fx.js'

import * as Eff from '@/Eff/index.js'

export class ZipAll<FX extends ReadonlyArray<AnyFx>> extends Eff.ZipAll<FX> {
  readonly __R?: () => ResourcesOf<FX[number]>
  readonly __E?: () => ErrorsOf<FX[number]>
  readonly __A?: () => { readonly [K in keyof FX]: OutputOf<FX[K]> }
}
