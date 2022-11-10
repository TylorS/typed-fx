import * as Effect from '@effect/core/io/Effect'
import * as Hub from '@effect/core/io/Hub'
import { pipe } from '@fp-ts/data/Function'

import { Fx } from './Fx.js'
import { fromDequeue } from './fromDequeue.js'
import { fromFxEffect } from './fromFxEffect.js'
import { scoped } from './transform.js'

export function fromHub<A>(hub: Hub.Hub<A>): Fx<never, never, A> {
  return pipe(hub.subscribe, Effect.map(fromDequeue), fromFxEffect, scoped)
}
