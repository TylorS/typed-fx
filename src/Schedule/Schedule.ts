import { Just, match } from 'hkt-ts/Maybe'
import { makeAssociative } from 'hkt-ts/Tuple'
import * as Associative from 'hkt-ts/Typeclass/Associative'
import { pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import {
  Continue,
  Decision,
  DecisionIntersectionAssociative,
  DecisionUnionAssociative,
  Done,
} from './Decision'
import {
  ScheduleState,
  ScheduleStateIntersectionAssociative,
  ScheduleStateUnionAssociative,
} from './ScheduleState'

import { Time } from '@/Clock/Clock'

const asap = Time(0)

const stateDecisionUnionAssociative = makeAssociative<ScheduleState, Decision>(
  ScheduleStateUnionAssociative,
  DecisionUnionAssociative,
)

const stateDecisionIntersectionAssociative = makeAssociative(
  ScheduleStateIntersectionAssociative,
  DecisionIntersectionAssociative,
)

export interface Schedule {
  readonly step: (now: Time, state: ScheduleState) => readonly [ScheduleState, Decision]
}

export const never: Schedule = {
  step: (now, state) => [state.next(now), Done],
}

export const once: Schedule = {
  step: (now, state) => [state.next(now), state.cumulativeDelay === 0 ? new Continue(asap) : Done],
}

export const forever: Schedule = {
  step: (now, state) => [state.next(now), new Continue(asap)],
}

export const recurring = (amount: NonNegativeInteger): Schedule => ({
  step: (now, state) => [state.next(now), state.iteration < amount ? new Continue(asap) : Done],
})

export const fixed = (delay: Time): Schedule => ({
  step: (now, state) => [state.next(now, Just(delay)), new Continue(delay)],
})

export const spaced = (delay: Time): Schedule => ({
  step: (now, state) => {
    const spacedDelay = pipe(
      state.previousDelay,
      match(
        () => delay,
        (n) => Time(n + delay),
      ),
    )

    return [state.next(now, Just(spacedDelay)), new Continue(spacedDelay)]
  },
})

export const exponential = (delay: Time): Schedule => ({
  step: (now, state) => {
    const exponentialDelay = pipe(
      state.previousDelay,
      match(
        () => delay,
        (n) => Time(n ** delay),
      ),
    )

    return [state.next(now, Just(exponentialDelay)), new Continue(exponentialDelay)]
  },
})

export const UnionAssociative: Associative.Associative<Schedule> = {
  concat: (f, s) => ({
    step: (now, state) =>
      stateDecisionUnionAssociative.concat(f.step(now, state), s.step(now, state)),
  }),
}

export const or =
  (second: Schedule) =>
  (first: Schedule): Schedule =>
    UnionAssociative.concat(first, second)

export const IntersectionAssociative: Associative.Associative<Schedule> = {
  concat: (f, s) => ({
    step: (now, state) =>
      stateDecisionIntersectionAssociative.concat(f.step(now, state), s.step(now, state)),
  }),
}

export const and =
  (second: Schedule) =>
  (first: Schedule): Schedule =>
    IntersectionAssociative.concat(first, second)
