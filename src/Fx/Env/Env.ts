import type { Fx, Of } from '../Fx/Fx.js'
import type { Layer } from '../Layer/Layer.js'

import type { Service } from '@/Service/index.js'

export interface Env<in R> {
  readonly get: <S extends R>(service: Service<S>) => Of<S>
  readonly provideService: <S, I extends S>(service: Service<S>, impl: I) => Env<R | S>
  readonly provideLayer: <R2, E2, B>(layer: Layer<R2, E2, B>) => Fx<R2, E2, Env<R | B>>
}
