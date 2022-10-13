import { pipe } from 'hkt-ts'

import * as Fx from './Fx.js'

import { CurrentLogAnnotations, CurrentLogSpans } from '@/FiberRef/builtins.js'
import { LogAnnotation } from '@/Logger/LogAnnotation.js'
import { LogLevel } from '@/Logger/LogLevel.js'
import { LogSpan } from '@/Logger/LogSpan.js'
import { EmptyTrace, Trace } from '@/Trace/Trace.js'

const makeLogWithLevel = (level: LogLevel) => (msg: string, __trace?: string) =>
  pipe(
    Fx.Do,
    Fx.bind('context', () => Fx.getFiberContext),
    Fx.bind('spans', () => Fx.get(CurrentLogSpans)),
    Fx.bind('annotations', () => Fx.get(CurrentLogAnnotations)),
    Fx.bind('trace', () => (level >= LogLevel.Trace ? Fx.getTrace : Fx.now<Trace>(EmptyTrace))),
    Fx.flatMap(
      ({ context, spans, annotations, trace }) =>
        context.logger.log(
          msg,
          level,
          context.id,
          Array.from(spans.values()),
          Array.from(annotations.values()),
          trace,
        ),
      __trace,
    ),
  )

export const logDebug = makeLogWithLevel(LogLevel.Debug)
export const logTrace = makeLogWithLevel(LogLevel.Trace)
export const logInfo = makeLogWithLevel(LogLevel.Info)
export const log = makeLogWithLevel(LogLevel.Log)
export const logWarn = makeLogWithLevel(LogLevel.Warn)
export const logError = makeLogWithLevel(LogLevel.Error)
export const logFatal = makeLogWithLevel(LogLevel.Fatal)

export const span =
  (label: string) =>
  <R, E, A>(fx: Fx.Fx<R, E, A>) =>
    pipe(
      Fx.Do,
      Fx.bind('spans', () => Fx.get(CurrentLogSpans)),
      Fx.bind('context', () => Fx.getFiberContext),
      Fx.flatMap(({ spans, context }) =>
        pipe(
          fx,
          Fx.locally(
            CurrentLogSpans,
            spans.set(label, LogSpan(label, context.platform.timer.getCurrentTime())),
          ),
        ),
      ),
    )

export const annotate =
  (label: string, value: string) =>
  <R, E, A>(fx: Fx.Fx<R, E, A>) =>
    pipe(
      Fx.get(CurrentLogAnnotations),
      Fx.flatMap((annotations) =>
        pipe(
          fx,
          Fx.locally(CurrentLogAnnotations, annotations.set(label, LogAnnotation(label, value))),
        ),
      ),
    )
