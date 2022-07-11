import { Just, Maybe, Nothing, makeAssociative, match } from 'hkt-ts/Maybe'
import { Associative } from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Time } from '@/Clock/Clock'

const minTimeAssociative = Time.makeAssociative({
  concat: Math.min,
})
const maybeMinTimeAssociative = makeAssociative(minTimeAssociative)

const maxTimeAssociative = Time.makeAssociative({
  concat: Math.max,
})
const maybeMaxTimeAssociative = makeAssociative(maxTimeAssociative)

export class ScheduleState {
  constructor(
    readonly time: Maybe<Time> = Nothing,
    readonly iteration: NonNegativeInteger = NonNegativeInteger(0),
    readonly previousDelay: Maybe<Time> = Nothing,
    readonly cumulativeDelay: Time = Time(0),
  ) {}

  readonly next = (now: Time, delay: Maybe<Time> = Nothing): ScheduleState =>
    new ScheduleState(
      Just(now),
      NonNegativeInteger(this.iteration + 1),
      delay,
      pipe(
        delay,
        match(
          () => this.cumulativeDelay,
          (d) => Time(this.cumulativeDelay + d),
        ),
      ),
    )

  readonly union = (state: ScheduleState): ScheduleState =>
    new ScheduleState(
      maybeMaxTimeAssociative.concat(this.time, state.time),
      NonNegativeInteger(Math.max(this.iteration, state.iteration)),
      maybeMinTimeAssociative.concat(this.previousDelay, state.previousDelay),
      minTimeAssociative.concat(this.cumulativeDelay, state.cumulativeDelay),
    )

  readonly intersect = (state: ScheduleState): ScheduleState =>
    new ScheduleState(
      maybeMaxTimeAssociative.concat(this.time, state.time),
      NonNegativeInteger(Math.max(this.iteration, state.iteration)),
      maybeMaxTimeAssociative.concat(this.previousDelay, state.previousDelay),
      maxTimeAssociative.concat(this.cumulativeDelay, state.cumulativeDelay),
    )
}

export const ScheduleStateUnionAssociative: Associative<ScheduleState> = {
  concat: (f, s) => f.union(s),
}

export const ScheduleStateIntersectionAssociative: Associative<ScheduleState> = {
  concat: (f, s) => f.intersect(s),
}
