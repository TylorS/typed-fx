import * as Maybe from 'hkt-ts/Maybe'
import { Associative, First } from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { AnyExit, makeParallelAssociative } from '@/Exit/Exit.js'
import { Delay, Time } from '@/Time/index.js'

const minDelayAssociative = Delay.makeAssociative({
  concat: Math.min,
})
const maybeMinDelayAssociative = Maybe.makeAssociative(minDelayAssociative)

const maxDelayAssociative = Delay.makeAssociative({
  concat: Math.max,
})
const maybeMaxDelayAssociative = Maybe.makeAssociative(maxDelayAssociative)

const maxTimeAssociative = Time.makeAssociative({
  concat: Math.max,
})
const maybeMaxTimeAssociative = Maybe.makeAssociative(maxTimeAssociative)

export class ScheduleState {
  constructor(
    /**
     * The Time at which the Schedule was last run
     */
    readonly time: Maybe.Maybe<Time> = Maybe.Nothing,
    /**
     * The previous Exit value, if any.
     */
    readonly exit: Maybe.Maybe<AnyExit> = Maybe.Nothing,
    /**
     * The number of iterations this Schedule has been through
     */
    readonly iteration: NonNegativeInteger = NonNegativeInteger(0),
    /**
     * The previousDelay of this Schedule, if any
     */
    readonly previousDelay: Maybe.Maybe<Delay> = Maybe.Nothing,
    /**
     * The cumulative delay of this Schedule, will remain 0 if no delay is applied.
     */
    readonly cumulativeDelay: Delay = Delay(0),
  ) {}

  readonly step = (
    now: Time,
    exit: AnyExit,
    delay: Maybe.Maybe<Delay> = Maybe.Nothing,
  ): ScheduleState =>
    new ScheduleState(
      Maybe.Just(now),
      Maybe.Just(exit),
      NonNegativeInteger(this.iteration + 1),
      delay,
      pipe(
        delay,
        Maybe.match(
          () => this.cumulativeDelay,
          (d) => Delay(this.cumulativeDelay + d),
        ),
      ),
    )

  readonly or = (state: ScheduleState): ScheduleState =>
    new ScheduleState(
      maybeMaxTimeAssociative.concat(this.time, state.time),
      Maybe.orElse(() => state.exit)(this.exit),
      NonNegativeInteger(Math.max(this.iteration, state.iteration)),
      maybeMinDelayAssociative.concat(this.previousDelay, state.previousDelay),
      minDelayAssociative.concat(this.cumulativeDelay, state.cumulativeDelay),
    )

  readonly and = (state: ScheduleState): ScheduleState =>
    new ScheduleState(
      maybeMaxTimeAssociative.concat(this.time, state.time),
      pipe(
        this.exit,
        Maybe.AssociativeBoth.both(state.exit),
        Maybe.map(([a, b]) => makeParallelAssociative<any, any>(First).concat(a, b)),
      ),
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
