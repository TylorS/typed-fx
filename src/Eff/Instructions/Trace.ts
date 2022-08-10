/* eslint-disable @typescript-eslint/ban-types */
import { pipe } from 'hkt-ts'
import { concatAll } from 'hkt-ts/Typeclass/Associative'

import { Eff } from '../Eff.js'
import { handle } from '../handle.js'

import * as Trace from '@/Trace/Trace.js'

export class AddTrace<Y, R> extends Eff.Instruction<readonly [Eff<Y, R>, Trace.Trace], R> {
  readonly tag = 'AddTrace'
}

export const addTrace =
  (trace: Trace.Trace) =>
  <Y, R>(eff: Eff<Y, R>): Eff<Y | AddTrace<Y, R>, R> =>
    new AddTrace([eff, trace])

export const addCustomTrace =
  (trace?: string) =>
  <Y, R>(eff: Eff<Y, R>) =>
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    trace
      ? pipe(trace, Trace.Trace.custom, addTrace)(eff)
      : // eslint-disable-next-line require-yield
        eff

export const addRuntimeTrace =
  <E extends { readonly stack?: string }>(error: E, targetObject?: Function | undefined) =>
  <Y, R>(eff: Eff<Y, R>) =>
    pipe(Trace.Trace.runtime(error, targetObject), addTrace)(eff)

export class GetTrace extends Eff.Instruction<void, Trace.Trace> {
  readonly tag = 'GetTrace'
}

export const getTrace = new GetTrace()

export type Tracing<Y, R> = AddTrace<Y, R> | GetTrace

const concatTraces = concatAll(Trace.Associative)(Trace.EmptyTrace)

export const withTracing =
  (parentTrace?: Trace.Trace) =>
  <Y, Y2, R>(eff: Eff<Y | Tracing<Y2, any>, R>): Eff<Exclude<Y, Tracing<Y2, any>> | Y2, R> =>
    pipe(
      eff,
      handle(function* (gen, result) {
        const traces: Array<Trace.Trace> = parentTrace ? [parentTrace] : []
        const getTrace = () => concatTraces(traces)

        const pushTrace = (trace: Trace.Trace) => {
          traces.unshift(Trace.trimOverlappingTraces(getTrace(), trace))

          return () => traces.shift()
        }

        while (!result.done) {
          const instr = result.value

          if (instr instanceof GetTrace) {
            result = gen.next(getTrace())
          } else if (instr instanceof AddTrace<Y, any>) {
            const [eff, trace] = instr.input

            const undo = pushTrace(trace)

            const nested = Eff.gen(eff)
            let nestedResult = nested.next()

            while (!nestedResult.done) {
              const instr = nestedResult.value

              if (isTraced(instr)) {
                const undo = pushTrace(Trace.Trace.custom(instr.__trace))
                nestedResult = nested.next(yield instr)
                undo()
              } else {
                nestedResult = nested.next(yield instr)
              }
            }

            result = gen.next(nestedResult.value)
            undo()
          } else {
            result = gen.next(yield instr as Exclude<Y, Tracing<Y2, any>>)
          }
        }

        return result.value
      }),
    )

function isTraced(x: unknown): x is { readonly __trace: string } {
  return !!x && typeof x === 'object' && '__trace' in x
}
