import { Left } from 'hkt-ts/Either'

import { Exit } from '@/Exit/index.js'
import * as Fx from '@/Fx/index.js'
import { Delay, Time } from '@/Time/index.js'

export interface PoolStategy<R, State, E, A> {
  readonly initial: Fx.RIO<R, State>
  readonly track: (state: State) => (item: Exit<E, A>) => Fx.Of<void>
  readonly run: (state: State, excess: Fx.Of<number>, shrink: Fx.Of<void>) => Fx.Of<void>
}

/**
 * A no-op PoolStrategy which doesn't perform any additional work. Great for
 * use in a fixed size pool which doesn't need to be resized.
 */
export const None: PoolStategy<never, unknown, any, any> = {
  initial: Fx.unit,
  track: () => () => Fx.unit,
  run: () => Fx.unit,
}

export type TimeToLiveState = {
  time: Time
}

/**
 * A Pool Strategy that will release resources that have not been utilized in the specific period of time.
 */
export class TimeToLive implements PoolStategy<never, TimeToLiveState, any, unknown> {
  constructor(readonly timeToLive: Delay) {}

  get initial() {
    return Fx.Fx(function* () {
      return {
        time: yield* Fx.getCurrentTime,
      }
    })
  }

  readonly track = (state: TimeToLiveState) => () =>
    Fx.Fx(function* () {
      state.time = yield* Fx.getCurrentTime
    })

  readonly run = (
    state: TimeToLiveState,
    getExcess: Fx.Of<number>,
    shrink: Fx.Of<void>,
  ): Fx.Of<void> => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    return Fx.Fx(function* () {
      const excess = yield* getExcess
      const context = yield* Fx.getFiberContext

      if (excess <= 0) {
        yield* sleep(that.timeToLive)

        return yield* that.run(state, getExcess, shrink)
      }

      const end = context.platform.timer.getCurrentTime()

      if (end - state.time >= that.timeToLive) {
        yield* shrink

        return yield* that.run(state, getExcess, shrink)
      }

      yield* sleep(that.timeToLive)

      return yield* that.run(state, getExcess, shrink)
    })
  }
}

const sleep = (delay: Delay) =>
  Fx.Fx(function* () {
    const context = yield* Fx.getFiberContext

    yield* Fx.async<never, never, unknown>((cb) => {
      const disposable = context.platform.timer.setTimer(() => cb(Fx.unit), delay)

      return Left(Fx.fromLazy(() => disposable.dispose()))
    })
  })
