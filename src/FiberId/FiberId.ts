import * as A from 'hkt-ts/Array'
import * as ASC from 'hkt-ts/Typeclass/Associative'
import * as E from 'hkt-ts/Typeclass/Eq'
import * as I from 'hkt-ts/Typeclass/Identity'
import * as N from 'hkt-ts/number'

import { Time } from '@/Time/index'

export type FiberId = FiberId.None | FiberId.Live | FiberId.Synthetic

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace FiberId {
  export const None = new (class None {
    readonly tag = 'None'
  })()

  export type None = typeof None

  export class Live {
    readonly tag = 'Live'
    constructor(readonly sequenceNumber: N.NonNegativeInteger, readonly startTime: Time) {}
  }

  export class Synthetic {
    readonly tag = 'Synthetic'

    constructor(readonly fiberIds: ReadonlyArray<FiberId>) {}
  }
}

export const None = FiberId.None
export type None = FiberId.None

export type Live = FiberId.Live
export const Live = (sequenceNumber: N.NonNegativeInteger, startTime: Time) =>
  new FiberId.Live(sequenceNumber, startTime)

export type Synthetic = FiberId.Synthetic
export const Synthetic = (fiberIds: ReadonlyArray<FiberId>) => new FiberId.Synthetic(fiberIds)

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
  concat: (f, s) => (f === None ? s : s === None ? f : Synthetic([f, s])),
}

export const Identity: I.Identity<FiberId> = {
  ...Associative,
  id: None,
}
