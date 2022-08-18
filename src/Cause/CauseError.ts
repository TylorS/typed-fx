import { Cause } from './Cause.js'
import { Renderer, defaultRenderer, prettyPrint } from './Renderer.js'

import * as Trace from '@/Trace/Trace.js'

export class CauseError<E> extends Error {
  constructor(readonly causedBy: Cause<E>, renderer: Renderer<E> = defaultRenderer) {
    // Separate any taces from the message to use the Error.stack with the Traces
    const [cause, trace] = causeAndTrace(causedBy)

    // Print the message
    super(prettyPrint(cause, renderer))

    this.name = 'CauseError'

    // If there is a Trace, add it to the Error
    if (trace.tag !== 'EmptyTrace') {
      this.stack = renderer.renderTrace(trace).replace(/\n/g, '\n    ')
    }

    // Ammend the Error that caused everything
    if (cause.tag === 'Unexpected' && cause.error instanceof Error) {
      this.cause = cause.error
    }

    this.toString = () => prettyPrint(causedBy, renderer)
  }
}

/**
 * Splits any top-level Trace nodes from the rest of the Cause
 */
export function causeAndTrace<E>(cause: Cause<E>): readonly [Cause<E>, Trace.Trace] {
  let trace: Trace.Trace = Trace.EmptyTrace
  let causeToPrint = cause

  while (causeToPrint.tag === 'Traced') {
    trace = Trace.Associative.concat(trace, causeToPrint.trace)
    causeToPrint = causeToPrint.cause
  }

  return [causeToPrint, trace] as const
}
