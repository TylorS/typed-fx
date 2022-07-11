import { AnyFx, ErrorsOf, Fx, OutputOf, ResourcesOf } from '../Fx'

import { FxInstruction } from './FxInstruction'

export class Race<FX extends ReadonlyArray<AnyFx>> extends FxInstruction<
  FX,
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  OutputOf<FX[number]>
> {}

export const race = <FX extends ReadonlyArray<AnyFx>>(
  ...fx: FX
): Fx<ResourcesOf<FX[number]>, ErrorsOf<FX[number]>, OutputOf<FX[number]>> => new Race(fx)
