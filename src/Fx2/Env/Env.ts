import type { Of } from '../Fx/Fx.js'

import type { Service } from '@/Service/index.js'

export interface Env<in R> {
  readonly get: <S extends R>(service: Service<S>) => Of<S>
}
