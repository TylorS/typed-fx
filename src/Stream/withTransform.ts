import { flow } from 'hkt-ts/function'

import { Stream } from './Stream.js'

import { Fx } from '@/Fx/Fx.js'

export const withTransform =
  (transform: <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>) =>
  <R, E, A>(stream: Stream<R, E, A>): Stream<R, E, A> =>
    new WithTransform(stream, transform)

export class WithTransform<R, E, A> implements Stream<R, E, A> {
  constructor(
    readonly stream: Stream<R, E, A>,
    readonly transform: <R, E, A>(fx: Fx<R, E, A>) => Fx<R, E, A>,
  ) {}

  readonly fork: Stream<R, E, A>['fork'] = (sink, context) =>
    this.stream.fork(sink, {
      ...context,
      transform: flow(context.transform, this.transform),
    })
}
