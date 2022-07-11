import { FiberId } from '@/FiberId/FiberId'
import { LogSpan } from '@/LogSpan/LogSpan'
import { Trace } from '@/Trace/Trace'

export abstract class Logger<A, B> {
  abstract readonly log: (
    trace: Trace,
    fiberId: FiberId,
    message: A,
    spans: ReadonlyArray<LogSpan>,
    annotations: ReadonlyMap<string, string>,
  ) => B
}
