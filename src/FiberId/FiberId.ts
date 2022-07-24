import * as A from 'hkt-ts/Array'
import * as ASC from 'hkt-ts/Typeclass/Associative'
import * as E from 'hkt-ts/Typeclass/Eq'
import * as I from 'hkt-ts/Typeclass/Identity'
import * as N from 'hkt-ts/number'

import { Clock } from '@/Clock/Clock'
import { Time } from '@/Time/index'

export type FiberId = FiberId.None | FiberId.Live | FiberId.Synthetic

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace FiberId {
  export const None = new (class None {
    readonly tag = 'None' as const
  })()

  export type None = typeof None

  export class Live {
    static tag = 'Live' as const
    readonly tag = Live.tag
    constructor(
      readonly clock: Clock, // The Clock used to create FiberId
      readonly sequenceNumber: N.NonNegativeInteger, // Incrementing SequenceNumber guaranteeing uniqueness
      readonly startTime: Time, // The monotonic Time at which this Fiber started, relative to its Clock.
    ) {}
  }

  export class Synthetic {
    static tag = 'Synthetic' as const
    readonly tag = Synthetic.tag

    constructor(readonly fiberIds: ReadonlyArray<FiberId>) {}
  }
}

export const None = FiberId.None
export type None = FiberId.None

export type Live = FiberId.Live
export const Live = (
  clock: Clock,
  sequenceNumber: N.NonNegativeInteger,
  startTime: Time,
): FiberId.Live => new FiberId.Live(clock, sequenceNumber, startTime)

Live.tag = FiberId.Live.tag

export type Synthetic = FiberId.Synthetic
export const Synthetic = (fiberIds: ReadonlyArray<FiberId>): FiberId.Synthetic =>
  new FiberId.Synthetic(fiberIds)

Synthetic.tag = FiberId.Synthetic.tag

export const match =
  <A, B, C>(
    onNone: () => A,
    onLive: (id: FiberId.Live) => B,
    onSynthetic: (id: FiberId.Synthetic) => C,
  ) =>
  (id: FiberId): A | B | C => {
    switch (id.tag) {
      case 'None':
        return onNone()
      case 'Live':
        return onLive(id)
      case 'Synthetic':
        return onSynthetic(id)
    }
  }

export const Eq: E.Eq<FiberId> = E.sum<FiberId>()('tag')({
  None: E.struct({ tag: E.string }),
  Live: E.struct({
    tag: E.string,
    sequenceNumber: N.NonNegativeIntegerEq,
    startTime: Time.makeEq(N.Eq),
  }),
  Synthetic: E.struct({ tag: E.string, fiberIds: A.makeEq(E.lazy(() => Eq)) }),
})

export const Associative: ASC.Associative<FiberId> = {
  concat: (f, s) => (f.tag === None.tag ? s : s.tag === None.tag ? f : Synthetic([f, s])),
}

export const Identity: I.Identity<FiberId> = {
  ...Associative,
  id: None,
}
