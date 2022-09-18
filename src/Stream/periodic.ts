import { Stream } from './Stream.js'
import { scheduled } from './scheduled.js'

import * as Fx from '@/Fx/Fx.js'
import * as Schedule from '@/Schedule/index.js'
import { Delay } from '@/Time/index.js'

export const periodic = (period: Delay): Stream<never, never, void> =>
  scheduled(Schedule.periodic(period))(Fx.unit)
