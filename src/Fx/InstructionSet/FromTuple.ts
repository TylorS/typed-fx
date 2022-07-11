import { AnyFx, ErrorsOf, Fx, OutputOf, ResourcesOf } from '../Fx'

import { FxInstruction } from './FxInstruction'

export class FromTuple<FX extends ReadonlyArray<AnyFx>> extends FxInstruction<
  FX,
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  { readonly [K in keyof FX]: OutputOf<FX[K]> }
> {}

export const tuple = <FX extends ReadonlyArray<AnyFx>>(
  ...fx: FX
): Fx<
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  { readonly [K in keyof FX]: OutputOf<FX[K]> }
> => new FromTuple(fx)
