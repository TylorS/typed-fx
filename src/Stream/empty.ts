import { Stream } from './Stream.js'

import * as Fx from '@/Fx/Fx.js'

export const empty = Stream<never, never, never>((sink, context) =>
  Fx.forkInContext(context)(sink.end),
)
