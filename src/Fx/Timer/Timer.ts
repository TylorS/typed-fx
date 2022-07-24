import { Clock } from '@/Clock/index'
import { Disposable } from '@/Fx/Disposable/Disposable'
import { Service } from '@/Service/index'
import { Delay } from '@/Time/index'

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
