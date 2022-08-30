import { HKT2, Params, pipe } from 'hkt-ts'
import { Either } from 'hkt-ts/Either'
import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'
import * as C from 'hkt-ts/Typeclass/Covariant'
import * as D from 'hkt-ts/Typeclass/Divariant'
import { Unary } from 'hkt-ts/Unary'

import { LogAnnotation } from './LogAnnotation.js'
import { LogLevel } from './LogLevel.js'
import { LogSpan } from './LogSpan.js'

import { FiberId } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/Fx.js'
import { Trace } from '@/Trace/Trace.js'

// TODO: Console as a Logger
// TODO: Build into Fx runtime

export interface Logger<A, B> {
  readonly log: (
    input: A,
    level: LogLevel,
    id: FiberId.Live,
    logSpans: ReadonlyArray<LogSpan>,
    logAnnotations: ReadonlyArray<LogAnnotation>,
    trace: Trace,
  ) => Fx.Of<B>
}

export function Logger<A, B>(log: Logger<A, B>['log']): Logger<A, B> {
  return { log }
}

export function both<A, C>(second: Logger<A, C>) {
  return <B>(first: Logger<A, B>): Logger<A, readonly [B, C]> =>
    Logger((...args) => Fx.both(second.log(...args))(first.log(...args)))
}

export function either<A, C>(second: Logger<A, C>) {
  return <B>(first: Logger<A, B>): Logger<A, Either<B, C>> =>
    Logger((...args) => Fx.either(second.log(...args))(first.log(...args)))
}

export interface LoggerHKT extends HKT2 {
  readonly type: Logger<this[Params.E], this[Params.A]>
}

export const Divariant: D.Divariant2<LoggerHKT> = {
  dimap:
    <A, B, C, D>(f: Unary<A, B>, g: Unary<C, D>) =>
    (logger: Logger<B, C>) =>
      Logger((i: A, level, id, logSpans, logAnnotations, trace) =>
        Fx.map(g)(logger.log(f(i), level, id, logSpans, logAnnotations, trace)),
      ),
}

export const dimap = Divariant.dimap

export const contramap = D.contramap(Divariant)
export const map = D.map(Divariant)

export const Covariant: C.Covariant2<LoggerHKT> = {
  map,
}

export const bindTo = C.bindTo(Covariant)
export const flap = C.flap(Covariant)
export const mapTo = C.mapTo(Covariant)
export const tupled = C.tupled(Covariant)

export const filterLogLevel =
  (predicate: (level: LogLevel) => boolean) =>
  <A, B>(logger: Logger<A, B>): Logger<A, Maybe<B>> => ({
    log: (...args): Fx.Of<Maybe<B>> =>
      Fx.lazy(() => {
        if (predicate(args[1])) {
          return pipe(
            logger.log(...args),
            Fx.map((a) => Just(a) as Maybe<B>),
          )
        }

        return Fx.now<Maybe<B>>(Nothing)
      }),
  })
