import { NonEmptyArray } from 'hkt-ts/NonEmptyArray'

import type { AnyFx, ErrorsOf, OutputOf, ResourcesOf } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

export class RaceAll<FX extends NonEmptyArray<AnyFx>> extends FxInstruction<
  FX,
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  OutputOf<FX[number]>
> {
  static tag = 'RaceAll' as const
  readonly tag = RaceAll.tag
}
