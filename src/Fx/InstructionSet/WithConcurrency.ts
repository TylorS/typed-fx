import { NonNegativeInteger } from 'hkt-ts/number'

import { AnyFx, ErrorsOf, Fx, OutputOf, ResourcesOf } from '../Fx'

import { FxInstruction } from './FxInstruction'

export class WithConcurrency<F extends AnyFx> extends FxInstruction<
  readonly [fx: F, concurrency: NonNegativeInteger],
  ResourcesOf<F>,
  ErrorsOf<F>,
  OutputOf<F>
> {}

export const withConcurrency =
  (concurrency: NonNegativeInteger) =>
  <F extends AnyFx>(fx: F): Fx<ResourcesOf<F>, ErrorsOf<F>, OutputOf<F>> =>
    new WithConcurrency([fx, concurrency])
