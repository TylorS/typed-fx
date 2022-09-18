import { Stream } from './Stream.js'

import * as Fx from '@/Fx/Fx.js'

export const empty = Stream<never, never, never>((sink, scheduler, context) =>
  Fx.asksEnv((env) => scheduler.asap(sink.end, env, context)),
)
