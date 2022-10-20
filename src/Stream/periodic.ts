import * as Effect from '@effect/core/io/Effect'
import { Fiber } from '@effect/core/io/Fiber'
import { pipe } from '@fp-ts/data/Function'
import * as Duration from '@tsplus/stdlib/data/Duration'
import * as Schedule from 'node_modules/@effect/core/io/Schedule.js'

import { Stream } from './Stream.js'

import { Sink } from '@/Sink/Sink.js'

export function periodic(period: Duration.Duration): Stream<never, never, void> {
  return Stream<never, never, void>(
    <R3, E3, B>(sink: Sink<never, void, R3, E3, B>): Effect.Effect<R3, never, Fiber<E3, B>> =>
      pipe(
        sink.event(undefined),
        Effect.schedule(Schedule.forever(Schedule.fromDuration(period))),
        Effect.flatMap(() => sink.end),
        Effect.fork,
      ),
  )
}
