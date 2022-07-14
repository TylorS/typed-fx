import { performance } from 'perf_hooks'

import { Clock, Time } from '@/Clock/Clock'

export class PerformanceClock extends Clock {
  constructor() {
    super(new Date(performance.timeOrigin), () => Time(performance.now()))
  }
}
