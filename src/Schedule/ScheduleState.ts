import { Just, Maybe, Nothing, makeAssociative, match } from 'hkt-ts/Maybe'
import { Associative } from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Delay, Time } from '@/Time'

const minDelayAssociative = Delay.makeAssociative({
  concat: Math.min,
})
const maybeMinDelayAssociative = makeAssociative(minDelayAssociative)

const maxDelayAssociative = Delay.makeAssociative({
  concat: Math.max,
})
const maybeMaxDelayAssociative = makeAssociative(maxDelayAssociative)

const maxTimeAssociative = Time.makeAssociative({
  concat: Math.max,
})
const maybeMaxTimeAssociative = makeAssociative(maxTimeAssociative)

export class ScheduleState {
  constructor(
    /**
     * The Time at which the Schedule was last run
     */
    readonly time: Maybe<Time> = Nothing,
    /**
     * The number of iterations this Schedule has been through
     */
    readonly iteration: NonNegativeInteger = NonNegativeInteger(0),
    /**
     * The previousDelay of this Schedule, if any
     */
    readonly previousDelay: Maybe<Delay> = Nothing,
    /**
     * The cumulative delay of this Schedule, will remain 0 if no delay is applied.
     */
    readonly cumulativeDelay: Delay = Delay(0),
  ) {}

  readonly next = (now: Time, delay: Maybe<Delay> = Nothing): ScheduleState =>
    new ScheduleState(
      Just(now),
      NonNegativeInteger(this.iteration + 1),
      delay,
      pipe(
        delay,
        match(
          () => this.cumulativeDelay,
          (d) => Delay(this.cumulativeDelay + d),
        ),
      ),
    )

  readonly or = (state: ScheduleState): ScheduleState =>
    new ScheduleState(
      maybeMaxTimeAssociative.concat(this.time, state.time),
      NonNegativeInteger(Math.max(this.iteration, state.iteration)),
      maybeMinDelayAssociative.concat(this.previousDelay, state.previousDelay),
      minDelayAssociative.concat(this.cumulativeDelay, state.cumulativeDelay),
    )

  readonly and = (state: ScheduleState): ScheduleState =>
    new ScheduleState(
      maybeMaxTimeAssociative.concat(this.time, state.time),
      NonNegativeInteger(Math.max(this.iteration, state.iteration)),
      maybeMaxDelayAssociative.concat(this.previousDelay, state.previousDelay),
      maxDelayAssociative.concat(this.cumulativeDelay, state.cumulativeDelay),
    )
}

export const ScheduleStateUnionAssociative: Associative<ScheduleState> = {
  concat: (f, s) => f.or(s),
}

export const ScheduleStateIntersectionAssociative: Associative<ScheduleState> = {
  concat: (f, s) => f.and(s),
}
