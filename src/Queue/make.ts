import { NonNegativeInteger } from 'hkt-ts/number'

import { makeDroppingStategy } from './DroppingStrategy.js'
import { Queue } from './Queue.js'
import { makeSlidingStategy } from './SlidingStrategy.js'
import { makeSuspendStrategy } from './SuspendStrategy.js'
import { makeUnboundedStategy } from './UnboundedStrategy.js'

export const unbounded = <A>(): Queue.Of<A> => Queue<A>(makeUnboundedStategy())

export const dropping = <A>(capacity: NonNegativeInteger): Queue.Of<A> =>
  Queue<A>(makeDroppingStategy(capacity))

export const sliding = <A>(capacity: NonNegativeInteger): Queue.Of<A> =>
  Queue<A>(makeSlidingStategy(capacity))

export const suspend = <A>(capacity: NonNegativeInteger): Queue.Of<A> =>
  Queue<A>(makeSuspendStrategy(capacity))
