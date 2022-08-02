/* eslint-disable @typescript-eslint/ban-types */
import { pipe } from 'hkt-ts'

import { Eff } from '../Eff.js'

import { Trace } from '@/Trace/Trace.js'

export class AddTrace<Y, R> extends Eff.Instruction<readonly [Eff<Y, R>, Trace], R> {
  readonly tag = 'AddTrace'
}

export const addTrace =
  (trace: Trace) =>
  <Y, R>(eff: Eff<Y, R>): Eff<Y | AddTrace<Y, R>, R> =>
    new AddTrace([eff, trace])

export const addCustomTrace =
  (trace?: string) =>
  <Y, R>(eff: Eff<Y, R>) =>
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    trace
      ? pipe(trace, Trace.custom, addTrace)(eff)
      : // eslint-disable-next-line require-yield
        eff

export const addRuntimeTrace =
  <E extends { readonly stack?: string }>(error: E, targetObject?: Function | undefined) =>
  <Y, R>(eff: Eff<Y, R>) =>
    pipe(Trace.runtime(error, targetObject), addTrace)(eff)

export class GetTrace extends Eff.Instruction<void, Trace> {
  readonly tag = 'GetTrace'
}

export const getTrace = new GetTrace()
