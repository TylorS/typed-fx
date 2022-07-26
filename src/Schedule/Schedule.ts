import { Just, match } from 'hkt-ts/Maybe'
import { makeAssociative } from 'hkt-ts/Tuple'
import * as Associative from 'hkt-ts/Typeclass/Associative'
import { Identity } from 'hkt-ts/Typeclass/Identity'
import { pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import {
  Continue,
  Decision,
  DecisionIntersectionAssociative,
  DecisionUnionAssociative,
  Done,
} from './Decision.js'
import {
  ScheduleState,
  ScheduleStateIntersectionAssociative,
  ScheduleStateUnionAssociative,
} from './ScheduleState.js'

import { Delay, Time } from '@/Time/index.js'

const asap = Delay(0)
const max = Delay(Number.MAX_SAFE_INTEGER)

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
  readonly and: (schedule: Schedule) => Schedule
  readonly or: (schedule: Schedule) => Schedule
}

export function Schedule(step: Schedule['step']): Schedule {
  const schedule: Schedule = {
    step,
    and: (other) => and(other)(schedule),
    or: (other) => or(other)(schedule),
  }

  return schedule
}

export const never: Schedule = Schedule((now, state) => [state.next(now), Done])

export const forever: Schedule = Schedule((now, state) => [
  state.next(now, Just(asap)),
  new Continue(asap),
])

export const recurring = (amount: NonNegativeInteger): Schedule =>
  Schedule((now, state) => [state.next(now), state.iteration < amount ? new Continue(asap) : Done])

export const periodic = (delay: Delay): Schedule =>
  Schedule((now, state) => [state.next(now, Just(delay)), new Continue(delay)])

export const delayed = (delay: Delay): Schedule => periodic(delay).and(once)

export const spaced = (delay: Delay): Schedule =>
  Schedule((now, state) => {
    const spacedDelay = pipe(
      state.previousDelay,
      match(
        () => delay,
        (n) => Delay(n + delay),
      ),
    )

    return [state.next(now, Just(spacedDelay)), new Continue(spacedDelay)]
  })

export const exponential = (delay: Delay): Schedule =>
  Schedule((now, state) => {
    const exponentialDelay = Delay(delay ** (state.iteration + 1))

    return [state.next(now, Just(exponentialDelay)), new Continue(exponentialDelay)]
  })

export const retries = (retries: NonNegativeInteger): Schedule =>
  Schedule((now, state) => {
    const next = state.next(now)

    // If we've reached our retry limit, lets return Done.
    if (next.iteration === retries) {
      return [next, Done]
    }

    return [next, new Continue(asap)]
  })

export const once = retries(NonNegativeInteger(1))

export const or =
  (second: Schedule) =>
  (first: Schedule): Schedule =>
    UnionAssociative.concat(first, second)

export const union = (...schedules: ReadonlyArray<Schedule>): Schedule =>
  schedules.length === 0 ? never : schedules.reduce((x, y) => or(y)(x))

export const and =
  (second: Schedule) =>
  (first: Schedule): Schedule =>
    IntersectionAssociative.concat(first, second)

export const intersect = (...schedules: ReadonlyArray<Schedule>): Schedule =>
  schedules.length === 0 ? once : schedules.reduce((x, y) => and(y)(x))

export const UnionAssociative: Associative.Associative<Schedule> = {
  concat: (f, s) =>
    Schedule((now, state) =>
      stateDecisionUnionAssociative.concat(f.step(now, state), s.step(now, state)),
    ),
}

export const UnionIdentity: Identity<Schedule> = {
  ...UnionAssociative,
  id: Schedule((now, state) => [state.next(now, Just(max)), new Continue(max)]),
}

export const IntersectionAssociative: Associative.Associative<Schedule> = {
  concat: (f, s) =>
    Schedule((now, state) =>
      stateDecisionIntersectionAssociative.concat(f.step(now, state), s.step(now, state)),
    ),
}

export const IntersectionIdentity: Identity<Schedule> = {
  ...IntersectionAssociative,
  id: forever,
}
