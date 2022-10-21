import * as Effect from '@effect/core/io/Effect'

import { fromEffect } from './fromEffect.js'

export const never = fromEffect(Effect.never)
