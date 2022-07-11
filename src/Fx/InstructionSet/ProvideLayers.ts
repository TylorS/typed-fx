import * as Fx from '../Fx'

import { FxInstruction } from './FxInstruction'

import * as Layer from '@/Layer/Layer'

export class ProvideLayers<
  F extends Fx.AnyFx,
  Layers extends ReadonlyArray<Layer.AnyLayer>,
> extends FxInstruction<
  readonly [F, Layers],
  Exclude<Fx.ResourcesOf<F> | Layer.ResourcesOf<Layers[number]>, Layer.ServiceOf<Layers[number]>>,
  Fx.ErrorsOf<F> | Layer.ErrorsOf<Layers[number]>,
  Fx.OutputOf<F>
> {}

export const provideLayers =
  <Layers extends ReadonlyArray<Layer.AnyLayer>>(...layers: Layers) =>
  <F extends Fx.AnyFx>(
    fx: F,
  ): Fx.Fx<
    Exclude<Fx.ResourcesOf<F> | Layer.ResourcesOf<Layers[number]>, Layer.ServiceOf<Layers[number]>>,
    Fx.ErrorsOf<F> | Layer.ErrorsOf<Layers[number]>,
    Fx.OutputOf<F>
  > =>
    new ProvideLayers([fx, layers]) as any
