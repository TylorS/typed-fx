import { flow, pipe } from 'hkt-ts'

import { Stream } from './Stream.js'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/Fx.js'
import { span } from '@/index.js'

/**
 * Constructs a Stream from an Fx that runs within a LogSpan enabling
 */
export function makeFromFx(logSpan: string) {
  return <R, E, A>(fx: Fx.Fx<R, E, A>, __trace?: string): Stream<R, E, A> => {
    return Stream((sink, scheduler, context) =>
      Fx.asksEnv(
        (env: Env<R>) =>
          scheduler.asap(
            pipe(
              fx,
              Fx.matchCause(
                sink.error,
                flow(
                  sink.event,
                  Fx.flatMap(() => sink.end),
                ),
              ),
            ),
            env,
            context,
            span(logSpan),
          ),
        __trace,
      ),
    )
  }
}

export const fromFx = makeFromFx('Stream.fromFx')
export const now = flow(Fx.now, makeFromFx('Stream.now'))
export const fromCause = flow(Fx.fromCause, makeFromFx(`Stream.fromCause`))
export const fromExit = flow(Fx.fromExit, makeFromFx(`Stream.fromExit`))
export const fromPromise = flow(Fx.fromPromise, makeFromFx(`Stream.fromPromise`))
export const fromLazy = flow(Fx.fromLazy, makeFromFx(`Stream.fromLazy`))
export const fromEither = flow(Fx.fromEither, makeFromFx(`Stream.fromEither`))
export const never = makeFromFx(`Stream.never`)(Fx.never)
