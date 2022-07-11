import { Associative } from 'hkt-ts/Typeclass/Associative'

import { Time } from '@/Clock/Clock'

export type Decision = Continue | Done

export class Continue {
  readonly tag = 'Continue'

  constructor(readonly delay: Time) {}
}

export const Done = new (class Done {
  readonly tag = 'Done'
})()
export type Done = typeof Done

export const DecisionUnionAssociative: Associative<Decision> = {
  concat: (f, s) => {
    if (f.tag === 'Done' && s.tag === 'Done') {
      return Done
    }

    if (f.tag === 'Done') {
      return s
    }

    if (s.tag === 'Done') {
      return f
    }

    return new Continue(Time(Math.min(f.delay, s.delay)))
  },
}

export const DecisionIntersectionAssociative: Associative<Decision> = {
  concat: (f, s) => {
    if (f.tag === 'Done' || s.tag === 'Done') {
      return Done
    }

    return new Continue(Time(Math.max(f.delay, s.delay)))
  },
}
