import { FiberRef } from '@/FiberRef/FiberRef.js'
import { fromLazy } from '@/Fx/Fx.js'
import { UnixTime } from '@/Time/index.js'

export interface LogSpan {
  readonly label: string
  readonly startTime: UnixTime
}

export function LogSpan(label: string, startTime: UnixTime): LogSpan {
  return {
    label,
    startTime,
  }
}

LogSpan.render = render

export function render(now: UnixTime) {
  return (logSpan: LogSpan): string => {
    const label = logSpan.label.indexOf(' ') < 0 ? logSpan.label : `"${logSpan.label}"`

    return `${label}=${now - logSpan.startTime}ms`
  }
}

export const CurrentLogSpans = FiberRef.make(fromLazy((): ReadonlyArray<LogSpan> => []))
