import { AnyFx, ErrorsOf, Fx, OutputOf, ResourcesOf } from '../Fx'

import { FxInstruction } from './FxInstruction'

export class SetInterruptible<F extends AnyFx> extends FxInstruction<
  [F, boolean],
  ResourcesOf<F>,
  ErrorsOf<F>,
  OutputOf<F>
> {}

export const uninterruptable = <F extends AnyFx>(
  fx: F,
): Fx<ResourcesOf<F>, ErrorsOf<F>, OutputOf<F>> => new SetInterruptible([fx, false])

export const interruptable = <F extends AnyFx>(
  fx: F,
): Fx<ResourcesOf<F>, ErrorsOf<F>, OutputOf<F>> => new SetInterruptible([fx, true])
