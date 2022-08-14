import { pipe } from 'hkt-ts'
import * as A from 'hkt-ts/Array'
import * as ASC from 'hkt-ts/Typeclass/Associative'
import * as D from 'hkt-ts/Typeclass/Debug'
import * as E from 'hkt-ts/Typeclass/Eq'
import * as I from 'hkt-ts/Typeclass/Identity'
import * as O from 'hkt-ts/Typeclass/Ord'
import * as N from 'hkt-ts/number'
import * as S from 'hkt-ts/string'

import { increment } from '@/Atomic/AtomicCounter.js'
import { Clock, timeToDate } from '@/Clock/Clock.js'
import { Platform } from '@/Platform/Platform.js'
import { Time } from '@/Time/index.js'

export type FiberId = FiberId.None | FiberId.Live | FiberId.Synthetic

export namespace FiberId {
  export interface None {
    readonly tag: 'None'
  }

  export const None: None = { tag: 'None' }

  export class Live {
    static readonly tag = 'Live'
    readonly tag = Live.tag
    constructor(
      readonly sequenceNumber: N.NonNegativeInteger, // Incrementing SequenceNumber guaranteeing uniqueness
      readonly clock: Clock, // The Clock used to create FiberId
      readonly startTime: Time, // The monotonic Time at which this Fiber started, relative to its Clock.
    ) {}
  }

  export class Synthetic {
    static readonly tag = 'Synthetic'
    readonly tag = Synthetic.tag

    constructor(readonly fiberIds: ReadonlyArray<FiberId>) {}
  }
}

export const None = FiberId.None
export type None = FiberId.None

export type Live = FiberId.Live
export const Live = ({ sequenceNumber, timer }: Platform): FiberId.Live =>
  new FiberId.Live(increment(sequenceNumber), timer, timer.getCurrentTime())

export type Synthetic = FiberId.Synthetic
export const Synthetic = (fiberIds: ReadonlyArray<FiberId>): FiberId.Synthetic =>
  new FiberId.Synthetic(fiberIds)

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

export const Ord: O.Ord<FiberId> = O.sum<FiberId>()('tag')(
  pipe(
    N.Ord,
    O.contramap((a) => (a === 'None' ? 0 : a === 'Live' ? 1 : 2)),
  ),
)({
  None: O.struct<FiberId.None>({ tag: O.Static })(S.Ord),
  Live: O.struct({
    sequenceNumber: N.NonNegativeIntegerOrd,
    startTime: Time.makeOrd(N.Ord),
    tag: O.Static,
  })(S.Ord),
  Synthetic: O.struct<FiberId.Synthetic>({
    fiberIds: A.makeOrd(O.lazy(() => Ord)),
    tag: O.Static,
  })(S.Ord),
})

export const Associative: ASC.Associative<FiberId> = {
  concat: (f, s) => (f.tag === None.tag ? s : s.tag === None.tag ? f : Synthetic([f, s])),
}

export const Identity: I.Identity<FiberId> = {
  ...Associative,
  id: None,
}

export const Debug: D.Debug<FiberId> = D.sum<FiberId>()('tag')({
  None: {
    debug: () => 'FiberId.None',
  },
  Live: {
    debug: (id) => `Fiber #${id.sequenceNumber} (started at ${idToIsoString(id)})`,
  },
  Synthetic: {
    debug: (id) => `Synthetic Fiber\n  -${id.fiberIds.map(Debug.debug).join('\n  -')}`,
  },
})

const idToIsoString = (id: FiberId.Live) => timeToDate(id.startTime)(id.clock).toISOString()
