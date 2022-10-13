import { flow, pipe } from 'hkt-ts'
import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'
import { Predicate } from 'hkt-ts/Predicate'
import { Refinement } from 'hkt-ts/Refinement'
import { Identity } from 'hkt-ts/Typeclass/Identity'

import { Fiber } from '@/Fiber/Fiber.js'
import { FiberRef, make } from '@/FiberRef/FiberRef.js'
import * as Fx from '@/Fx/index.js'
import { unit } from '@/Fx/index.js'
import * as Sink from '@/Sink/Sink.js'

export interface Stream<R, E, A, E1 = never> {
  readonly fork: <R2, E2, B>(
    sink: Sink.Sink<E, A, R2, E1 | E2, B>,
  ) => Fx.RIO<R | R2, Fiber<E1 | E2, B>>
}

export function Stream<R, E, A, E1>(fork: Stream<R, E, A, E1>['fork']): Stream<R, E, A, E1> {
  return { fork }
}

export function fromFx<R, E, A>(fx: Fx.Fx<R, E, A>): Stream<R, E, A> {
  return {
    fork: (sink) =>
      pipe(
        fx,
        Fx.matchCause(
          sink.error,
          flow(
            sink.event,
            Fx.flatMap(() => sink.end),
          ),
        ),
        Fx.fork,
      ),
  }
}

export function drain<R, E, A, E1>(stream: Stream<R, E, A, E1>): Fx.RIO<R, Fiber<E | E1, void>> {
  return stream.fork(new Sink.Drain<E, A, never, never, void>(unit))
}

export function fork<E, A, R2, E2, B>(sink: Sink.Sink<E, A, R2, E2, B>) {
  return <R, E1>(stream: Stream<R, E, A, E1>): Fx.RIO<R | R2, Fiber<E1 | E2, B>> =>
    stream.fork(sink)
}

export function forkJoin<E, A, R2, E2, B>(sink: Sink.Sink<E, A, R2, E2, B>) {
  return <R, E1>(stream: Stream<R, E, A, E1>): Fx.Fx<R | R2, E1 | E2, B> =>
    Fx.flatJoin(stream.fork(sink))
}

export function map<A, B>(f: (a: A) => B) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, B, E1> =>
    Stream((sink) => stream.fork(Sink.Map.make(sink, f)))
}

export function filter<A, B extends A>(
  f: Refinement<A, B>,
): <R, E, E1>(stream: Stream<R, E, A, E1>) => Stream<R, E, B, E1>
export function filter<A>(
  f: Predicate<A>,
): <R, E, E1>(stream: Stream<R, E, A, E1>) => Stream<R, E, A, E1>

export function filter<A>(f: Predicate<A>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Stream<R, E, A, E1> =>
    Stream((sink) => stream.fork(Sink.Filter.make(sink, f)))
}

export function scan<A, B>(seed: A, f: (a: A, b: B) => A) {
  return <R, E>(stream: Stream<R, E, B>): Stream<R, E, A> =>
    Stream((sink) => stream.fork(Sink.Scan.make(sink, seed, f)))
}

export function observe<A, R2, E2, B>(f: (a: A) => Fx.Fx<R2, E2, B>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Fx.RIO<R | R2, Fiber<E | E1 | E2, void>> =>
    stream.fork(new Sink.Observe<E, A, R2, E2>(f))
}

export function intoFiberRef<R2, E2, A>(fiberRef: FiberRef<R2, E2, A>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>): Fx.RIO<R2 | R, Fiber<E | E1 | E2, A>> =>
    stream.fork(new Sink.IntoFiberRef(fiberRef))
}

export function last<R, E, A, E1>(stream: Stream<R, E, A, E1>): Fx.Fx<R, E | E1, Maybe<A>> {
  return pipe(
    stream,
    map<A, Maybe<A>>(Just),
    forkJoin(new Sink.IntoFiberRef(make(Fx.now<Maybe<A>>(Nothing)))),
  )
}

export function fromArray<A extends ReadonlyArray<any>>(
  array: readonly [...A],
): Stream<never, never, A[number]> {
  return Stream((sink) =>
    Fx.fork(
      array.reduceRight(
        (previous, current) =>
          pipe(
            current,
            sink.event,
            Fx.flatMap(() => previous),
          ),
        sink.end,
      ),
    ),
  )
}

export function foldMap<B, A>(I: Identity<B>, f: (a: A) => Maybe<B>) {
  return <R, E, E1>(stream: Stream<R, E, A, E1>) =>
    forkJoin(new Sink.FoldMap<E, A, B>(f, I))(stream)
}

export function foldLeft<A>(I: Identity<A>) {
  return foldMap<A, A>(I, Just)
}
