import { Stream } from './Stream.js'

import * as Fx from '@/Fx/Fx.js'
import { span } from '@/Fx/logging.js'

export const empty = Stream<never, never, never>((sink, scheduler, context) =>
  Fx.asksEnv((env) => scheduler.asap(sink.end, env, context, span('empty'))),
)
