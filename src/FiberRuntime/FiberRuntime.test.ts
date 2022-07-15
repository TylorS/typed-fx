import { deepStrictEqual } from 'assert'

import { Right } from 'hkt-ts/Either'
import { Nothing } from 'hkt-ts/Maybe'

import { FiberRuntime } from './FiberRuntime'

import { DateClock } from '@/Clock/Clock'
import { Env } from '@/Env/Env'
import { FiberId } from '@/FiberId/FiberId'
import { FiberRefs } from '@/FiberRefs/FiberRefs'
import { fromExit } from '@/Fx/index'
import { Platform } from '@/Platform/Platform'
import { DefaultScheduler } from '@/Scheduler/DefaultScheduler'
import { SequentialStrategy } from '@/Scope/Finalizer'
import { LocalScope } from '@/Scope/LocalScope'
import { None } from '@/Supervisor/None'

describe(__filename, () => {
  const platform = new Platform()
  const clock = new DateClock()
  const scheduler = new DefaultScheduler(clock)
  const fiberId = FiberId(platform.sequenceNumber.increment, clock.currentTime())

  it(fromExit.name, (done) => {
    const fx = fromExit(Right(1))
    const runtime = new FiberRuntime(fx, {
      fiberId,
      platform,
      env: new Env(),
      scheduler,
      supervisor: None,
      fiberRefs: new FiberRefs(new Map()),
      scope: new LocalScope(SequentialStrategy),
      parent: Nothing,
    })

    runtime.addObserver((exit) => {
      try {
        deepStrictEqual(exit, Right(1))
        done()
      } catch (e) {
        done(e)
      }
    })

    runtime.start()
  })
})
