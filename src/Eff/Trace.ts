/* eslint-disable @typescript-eslint/ban-types */
import { pipe } from 'hkt-ts'

import { Eff } from './Eff.js'

import { EmptyTrace, Trace } from '@/Trace/Trace.js'

export class AddTrace extends Eff.Instruction<Trace, Trace> {
  readonly tag = 'AddTrace'
}

export const addTrace = (trace: Trace) => new AddTrace(trace)

export const addCustomTrace = (trace?: string): Eff<AddTrace, Trace> =>
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  trace
    ? pipe(trace, Trace.custom, addTrace)
    : // eslint-disable-next-line require-yield
      Eff(function* () {
        return EmptyTrace
      })

export const addRuntimeTrace = <E extends { readonly stack?: string }>(
  error: E,
  targetObject?: Function | undefined,
) => pipe(Trace.runtime(error, targetObject), addTrace)

export class GetTrace extends Eff.Instruction<void, Trace> {
  readonly tag = 'GetTrace'
}

export const getTrace = new GetTrace()
