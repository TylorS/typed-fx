import { Stream } from './Stream.js'
import { scheduled } from './scheduled.js'

import * as Fx from '@/Fx/Fx.js'
import * as Schedule from '@/Schedule/index.js'
import { Delay } from '@/Time/index.js'

export const periodic = (period: Delay, __trace?: string): Stream<never, never, void> =>
  scheduled(Schedule.periodic(period), __trace)(Fx.unit)
