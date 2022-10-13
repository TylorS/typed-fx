import { pipe } from 'hkt-ts'

import { Fx, flatMap, get, provideSome } from './Fx.js'

import { Env } from '@/Env/index.js'
import type * as Layer from '@/Layer/Layer.js'

export const provideLayer =
  <R2, E2, S>(layer: Layer.Layer<R2, E2, S>, __trace?: string) =>
  <R, E, A>(fx: Fx<R, E, A>): Fx<R2 | Exclude<R, S>, E | E2, A> =>
    pipe(
      layer,
      get,
      flatMap((env: Env<S>) => pipe(fx, provideSome(env)), __trace),
    )
