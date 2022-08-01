/* eslint-disable @typescript-eslint/ban-types */
import { pipe } from 'hkt-ts'

import { Eff } from './Eff.js'

import { Trace } from '@/Trace/Trace.js'

export class AddTrace implements Eff<AddTrace, void> {
  readonly tag = 'AddTrace'

  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor(readonly trace: Trace) {}

  *[Symbol.iterator]() {
    return (yield this) as void
  }
}

export const addTrace = (trace: Trace) => new AddTrace(trace)

export const addCustomTrace = (trace?: string): Eff<AddTrace, void> =>
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  trace ? pipe(trace, Trace.custom, addTrace) : Eff(function* () {})

export const addRuntimeTrace = <E extends { readonly stack?: string }>(
  error: E,
  targetObject?: Function | undefined,
) => pipe(Trace.runtime(error, targetObject), addTrace)

export class GetTrace implements Eff<GetTrace, Trace> {
  readonly tag = 'GetTrace';

  *[Symbol.iterator]() {
    return (yield this) as Trace
  }
}

export const getTrace = new GetTrace()
