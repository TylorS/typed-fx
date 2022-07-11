import { AnyFx, ErrorsOf, Fx, OutputOf, ResourcesOf } from '../Fx'

import { FxInstruction } from './FxInstruction'

export class WithConcurrency<F extends AnyFx> extends FxInstruction<
  readonly [fx: F, concurrency: number],
  ResourcesOf<F>,
  ErrorsOf<F>,
  OutputOf<F>
> {}

export const withConcurrency =
  (concurrency: number) =>
  <F extends AnyFx>(fx: F): Fx<ResourcesOf<F>, ErrorsOf<F>, OutputOf<F>> =>
    new WithConcurrency([fx, concurrency])
