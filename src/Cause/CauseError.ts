import { Cause } from './Cause.js'
import { Renderer, defaultRenderer, prettyPrint } from './Renderer.js'

import * as Trace from '@/Trace/Trace.js'

export class CauseError<E> extends Error {
  constructor(readonly causedBy: Cause<E>, readonly renderer: Renderer<E> = defaultRenderer) {
    // Separate any taces from the message to use the Error.stack with the Traces
    const [message, trace] = causeAndTrace(causedBy, renderer)

    super(message)

    // If there is a Trace, add it to the Error
    if (trace.tag !== 'EmptyTrace') {
      this.stack = renderer.renderTrace(trace)
    }
  }
}

/**
 * Splits any top-level Trace nodes from the rest of the Cause
 */
function causeAndTrace<E>(cause: Cause<E>, renderer: Renderer<E>) {
  let trace: Trace.Trace = Trace.EmptyTrace
  let causeToPrint = cause

  while (causeToPrint.tag === 'Traced') {
    trace = Trace.Associative.concat(trace, causeToPrint.trace)
    causeToPrint = causeToPrint.cause
  }

  return [prettyPrint(causeToPrint, renderer), trace] as const
}
