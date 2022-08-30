import { LogAnnotation } from './LogAnnotation.js'
import { LogLevel } from './LogLevel.js'
import { LogSpan } from './LogSpan.js'
import { Logger } from './Logger.js'

import { Clock, timeToUnixTime } from '@/Clock/index.js'
import { format, fromTime } from '@/Duration/Duration.js'
import { Fx, getFiberContext } from '@/Fx/Fx.js'
import { Time } from '@/Time/index.js'
import * as Trace from '@/Trace/index.js'

export const Console: Logger<string, void> = {
  log: (input, level, id, logSpans, logAnnotations, trace) =>
    Fx(function* () {
      if (level === LogLevel.None) {
        return
      }

      const { platform } = yield* getFiberContext
      const now = platform.timer.getCurrentTime()

      const message = [
        `timestamp=${getIsoString(now, platform.timer)}`,
        `level=${formatLogLevel(level)}`,
        `fiber=${id.sequenceNumber}`,
        ...logSpans.map(formatLogSpan(now)),
        ...logAnnotations.map(formatlogAnnotation),
        `message=${input}`,
      ].join('; ')

      logWithLevel(
        trace.tag !== 'EmptyTrace' ? message + '\n' + Trace.debug(trace) : message,
        level,
      )
    }),
}

function formatLogLevel(level: LogLevel) {
  switch (level) {
    case LogLevel.None:
      return 'none'
    case LogLevel.Fatal:
      return 'fatal'
    case LogLevel.Error:
      return 'error'
    case LogLevel.Warn:
      return 'warn'
    case LogLevel.Info:
      return 'info'
    case LogLevel.Log:
      return 'log'
    case LogLevel.Trace:
      return 'trace'
    case LogLevel.Debug:
      return 'debug'
  }
}

function logWithLevel(message: string, level: LogLevel) {
  switch (level) {
    case LogLevel.Fatal:
    case LogLevel.Error:
      return console.error(message)
    case LogLevel.Warn:
      return console.warn(message)
    case LogLevel.Info:
      return console.info(message)
    case LogLevel.Log:
      return console.log(message)
    case LogLevel.Trace:
      return console.trace(message)
    case LogLevel.Debug:
      return console.debug(message)
  }
}

function getIsoString(time: Time, clock: Clock) {
  return new Date(timeToUnixTime(time)(clock)).toISOString()
}

function formatLogSpan(now: Time) {
  return (span: LogSpan) => {
    return `${span.label}=${format(fromTime(Time(now - span.start)))}`
  }
}

function formatlogAnnotation(annotation: LogAnnotation) {
  return `${annotation.label}=${annotation.value}`
}
