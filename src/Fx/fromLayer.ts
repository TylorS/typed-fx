import * as Fx from './Fx.js'

import { Layer } from '@/Layer/Layer.js'
import { Scope } from '@/Scope/Scope.js'

export function fromLayer<R, E, A>(layer: Layer<R, E, A>): Fx.Fx<R | Scope, E, A> {
  return Fx.flatMap(layer.build)(Fx.ask(Scope))
}
