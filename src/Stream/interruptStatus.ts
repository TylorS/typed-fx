import { pipe } from 'hkt-ts/function'

import { Stream } from './Stream.js'
import { withTransform } from './withTransform.js'

import * as Fx from '@/Fx/Fx.js'

export const uninterruptable = <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> =>
  pipe(stream, withTransform(Fx.uninterruptable))

export const interruptable = <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> =>
  pipe(stream, withTransform(Fx.interruptable))
