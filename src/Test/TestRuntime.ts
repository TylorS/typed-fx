import { TestClock } from './TestClock'
import { TestScheduler } from './TestScheduler'
import { TestTimer } from './TestTimer'

import { Env } from '@/Env/Env'
import { Fx } from '@/Fx/Fx'
import { Platform } from '@/Platform/Platform'
import { Runtime, RuntimeFiberParams, RuntimeParams } from '@/Runtime/Runtime'
import { Delay } from '@/Timer/Timer'

export interface TestRuntimeOptions<R> extends Omit<RuntimeParams<R>, 'scheduler'> {}

export const makeTestRuntime = <R = never>(
  startTime: Date,
  params: Partial<TestRuntimeOptions<R>> = {},
): TestRuntime<R> =>
  new TestRuntime(startTime, {
    env: new Env<never>(),
    platform: new Platform(),
    scheduler: new TestScheduler(new TestTimer(new TestClock(startTime))),
    ...params,
  })

export interface TestRuntimeParams<R> extends RuntimeParams<R> {
  readonly scheduler: TestScheduler
}

export interface TestRuntimeFiberParams extends RuntimeFiberParams {
  readonly delay?: Delay
}

export class TestRuntime<R> extends Runtime<R> {
  constructor(readonly startTime: Date, readonly params: TestRuntimeParams<R>) {
    super(params)
  }

  readonly runWithDelay = <E, A>(fx: Fx<R, E, A>, params?: TestRuntimeFiberParams) => {
    const promise = this.run(fx, params)

    this.progressTimeWith(params)

    return promise
  }

  readonly runExitWithDelay = <E, A>(fx: Fx<R, E, A>, params?: TestRuntimeFiberParams) => {
    const promise = this.runExit(fx, params)

    this.progressTimeWith(params)

    return promise
  }

  readonly runFiberWithDelay = <E, A>(fx: Fx<R, E, A>, params?: TestRuntimeFiberParams) => {
    const fiber = this.runFiber(fx, params)

    this.progressTimeWith(params)

    return fiber
  }

  readonly progessTimeBy = this.params.scheduler.progessTimeBy
  readonly progessTimeTo = this.params.scheduler.progessTimeTo

  protected progressTimeWith = (params: TestRuntimeFiberParams | undefined) => {
    const delay = params?.delay ?? Delay(0)

    this.progessTimeBy(delay)
  }
}
