import { NonNegativeInteger } from 'hkt-ts/number'

import { Stream } from './Stream.js'

import * as Fx from '@/Fx/index.js'
import { SchedulerContext } from '@/Scheduler/Scheduler.js'
import { Sink } from '@/Sink/Sink.js'

export function slice(skip: NonNegativeInteger, take: NonNegativeInteger) {
  return <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> => new Slice(stream, skip, take)
}

export const skip =
  (amount: NonNegativeInteger) =>
  <R, E, A>(stream: Stream<R, E, A>) =>
    new Slice(stream, amount, NonNegativeInteger(Infinity))

export const take =
  (amount: NonNegativeInteger) =>
  <R, E, A>(stream: Stream<R, E, A>) =>
    new Slice(stream, NonNegativeInteger(0), amount)

// TODO: Handle commutation of Slice + Map

export class Slice<R, E, A> implements Stream<R, E, A> {
  constructor(
    readonly stream: Stream<R, E, A>,
    readonly skip: NonNegativeInteger,
    readonly take: NonNegativeInteger,
  ) {}

  readonly fork: Stream<R, E, A>['fork'] = (sink, context) =>
    this.stream.fork(new SliceSink(sink, context, this.skip, this.take), context)
}

export class SliceSink<R, E, A> implements Sink<E, A> {
  protected _end = this.skip + this.take
  protected _count = 0

  constructor(
    readonly sink: Sink<E, A>,
    readonly context: SchedulerContext<R>,
    readonly skip: NonNegativeInteger,
    readonly take: NonNegativeInteger,
  ) {}

  readonly event: (a: A) => Fx.IO<E, unknown> = (a) => {
    const count = ++this._count

    if (count > this.skip) {
      return this.sink.event(a)
    }

    if (count === this._end) {
      return this.end
    }

    return Fx.unit
  }

  readonly error = this.sink.error
  readonly end = this.sink.end
}
