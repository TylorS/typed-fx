import { pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'
import { collect } from './drain.js'

import * as Fx from '@/Fx/Fx.js'
import { runMain } from '@/Fx/run.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { Scheduler } from '@/Scheduler/index.js'

export const collectAll = <E, A>(stream: Stream<Scheduler, E, A>) =>
  pipe(collect(stream), Fx.provideService(Scheduler, RootScheduler()), runMain)
