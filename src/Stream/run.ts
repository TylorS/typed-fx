import { flow, pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'
import { drain } from './drain.js'

import * as Fx from '@/Fx/index.js'

export const run = flow(drain, Fx.flatJoin)

export const runMain = <E, A>(stream: Stream<never, E, A>): Promise<unknown> =>
  pipe(stream, run, Fx.runMain)
