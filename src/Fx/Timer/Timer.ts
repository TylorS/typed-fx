import { Clock } from '@/Clock/index.js'
import { Disposable } from '@/Fx/Disposable/Disposable.js'
import { Service } from '@/Service/index.js'
import { Delay } from '@/Time/index.js'

export interface Timer extends Clock {
  readonly setTimer: (f: () => void, delay: Delay) => Disposable
}

export function Timer(clock: Clock, setTimer: Timer['setTimer']): Timer {
  return {
    ...clock,
    setTimer,
  }
}

export namespace Timer {
  export const service: Service<Timer> = Service<Timer>('Timer')
}
