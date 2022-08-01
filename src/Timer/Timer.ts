import * as C from '@/Clock/index.js'
import { Disposable } from '@/Disposable/Disposable.js'
import { Service } from '@/Service/index.js'
import { Delay } from '@/Time/index.js'

export interface Timer extends C.Clock {
  readonly setTimer: (f: () => void, delay: Delay) => Disposable
}

export const Timer = Service<Timer>('Timer')

export function make(clock: C.Clock, setTimer: Timer['setTimer']): Timer {
  return {
    ...clock,
    setTimer,
  }
}

export function fork(timer: Timer): Timer {
  return {
    ...timer,
    ...C.fork(timer),
  }
}
