import { isLeft } from 'hkt-ts/Either'
import * as Maybe from 'hkt-ts/Maybe'
import { flow, identity, pipe } from 'hkt-ts/function'

import { Stream } from './Stream'
import { forkStreamContext } from './drain'
import { FilterMap } from './filterMap'

import { Env } from '@/Env/Env'
import { FiberContext } from '@/FiberContext/index'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime'
import { Fx, IO, Of } from '@/Fx/Fx'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import { zipAll } from '@/Fx/InstructionSet/ZipAll'
import { get, provide, result, unit } from '@/Fx/index'
import { lazy } from '@/Fx/lazy'
import { Sink } from '@/Sink/Sink'
import { Supervisor } from '@/Supervisor/Supervisor'
import { fibersIn } from '@/Supervisor/fibersIn'

export const filterFlatMap =
  <A, R2, E2, B>(f: (a: A) => Maybe.Maybe<Stream<R2, E2, B>>) =>
  <R, E>(stream: Stream<R, E, A>) =>
    FilterFlatMap.make(stream, f)

export const flatMap =
  <A, R2, E2, B>(f: (a: A) => Stream<R2, E2, B>) =>
  <R, E>(stream: Stream<R, E, A>) =>
    FilterFlatMap.make(stream, flow(f, Maybe.Just))

export const flatten = flatMap(identity) as <R, E, R2, E2, A>(
  stream: Stream<R, E, Stream<R2, E2, A>>,
) => Stream<R | R2, E | E2, A>

export class FilterFlatMap<R, E, A, R2, E2, B> extends Stream<R | R2, E | E2, B> {
  constructor(
    readonly stream: Stream<R, E, A>,
    readonly f: (a: A) => Maybe.Maybe<Stream<R2, E2, B>>,
  ) {
    super((sink, context) =>
      Fx(function* () {
        const supervisor = fibersIn()
        const env = yield* get<R | R2>()
        const flatMapSink: Sink<E, A> = new FlatMapSink<R, E, A, R2, E2, B>(
          sink,
          context,
          env,
          supervisor,
          f,
        )

        return yield* stream.fork(flatMapSink, context)
      }),
    )
  }

  static make<R, E, A, R2, E2, B>(
    stream: Stream<R, E, A>,
    f: (a: A) => Maybe.Maybe<Stream<R2, E2, B>>,
  ) {
    if (stream instanceof FilterMap) {
      return new FilterFlatMap(stream.stream, flow(stream.filterMap, Maybe.flatMap(f)))
    }

    return new FilterFlatMap(stream, f)
  }
}

export class FlatMapSink<R, E, A, R2, E2, B> extends Sink<E, A> {
  protected ended = false
  protected remaining = 0

  constructor(
    readonly sink: Sink<E | E2, B>,
    readonly context: FiberContext,
    readonly env: Env<R | R2>,
    readonly supervisor: Supervisor<ReadonlySet<FiberRuntime<any, any, any>>>,
    readonly f: (a: A) => Maybe.Maybe<Stream<R2, E2, B>>,
  ) {
    super()
  }

  readonly event = (a: A): IO<E, unknown> =>
    lazy(() => {
      const { context, env, supervisor, f, innerSink } = this

      return pipe(
        Fx(function* () {
          const stream = f(a)

          if (Maybe.isNothing(stream)) {
            return
          }

          const streamContext = yield* forkStreamContext(context)
          const fiber = yield* stream.value.fork(innerSink(), { ...streamContext, supervisor })
          const exit = yield* fiber.exit

          if (isLeft(exit)) {
            yield* context.scope.close(exit)
          } else {
            yield* fiber.inheritFiberRefs
          }
        }),
        provide(env),
      )
    })

  readonly end: Of<unknown> = lazy(() => {
    this.ended = true

    return this.endIfNothingRemaining
  })

  protected endIfNothingRemaining = lazy(() => {
    if (this.ended && this.remaining === 0) {
      return this.finalize
    }

    return unit
  })

  protected finalize = lazy(() => {
    const runtimes = this.supervisor.atomic

    return Fx(function* () {
      const { id } = yield* getFiberContext

      yield* zipAll(...Array.from(runtimes.get).map((r) => r.interrupt(id)))
    })
  })

  protected innerSink(): Sink<E2, B> {
    const { sink, context } = this

    return {
      event: (b) =>
        Fx(function* () {
          const exit = yield* result(sink.event(b))

          if (isLeft(exit)) {
            yield* context.scope.close(exit)
          }
        }),
      end: lazy(() => {
        this.remaining--
        return this.endIfNothingRemaining
      }),
    }
  }
}
