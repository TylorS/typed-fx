/* eslint-disable @typescript-eslint/ban-types */
import { pipe } from 'hkt-ts'
import { concatAll } from 'hkt-ts/Typeclass/Associative'

import { Eff } from '@/Eff/Eff.js'
import { handle } from '@/Eff/handle.js'
import * as Trace from '@/Trace/Trace.js'

export class AddTrace<Y, R> extends Eff.Instruction<readonly [Eff<Y, R>, Trace.Trace], R> {
  static tag = 'AddTrace' as const
  readonly tag = AddTrace.tag
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
  static tag = 'GetTrace' as const
  readonly tag = GetTrace.tag
}

export const getTrace = new GetTrace()

export type Tracing<Y, R> = AddTrace<Y, R> | GetTrace

const concatTraces = concatAll(Trace.Associative)(Trace.EmptyTrace)

export const withTracing =
  (parentTrace?: Trace.Trace) =>
  <Y, R>(eff: Eff<Y | Tracing<Y, any>, R>): Eff<Exclude<Y, Tracing<Y, any>>, R> =>
    pipe(
      eff,
      handle(function* (gen, result) {
        const traces: Array<Trace.Trace> = parentTrace ? [parentTrace] : []
        const getTrace = () => concatTraces(traces)

        const pushTrace = (trace: Trace.Trace) => {
          traces.unshift(Trace.trimOverlappingTraces(getTrace(), trace))

          return () => traces.shift()
        }

        function* handleInstruction<
          Y,
          R,
        >(gen: Generator<Y | Tracing<Y, any>, R>, instr: Y | Tracing<Y, any>): Generator<Exclude<Y, Tracing<Y, any>>, IteratorResult<Y | Tracing<Y, any>, R>> {
          if (instr instanceof GetTrace) {
            return gen.next(getTrace())
          } else if (instr instanceof AddTrace<Y, any>) {
            const [eff, trace] = instr.input

            const undo = pushTrace(trace)

            const nested = Eff.gen(eff)

            let nestedResult = nested.next()
            while (!nestedResult.done) {
              nestedResult = yield* (handleInstruction as any)(nested, nestedResult.value)
            }

            const result = gen.next(nestedResult.value)

            undo()

            return result
          } else if (isTraced(instr)) {
            const undo = pushTrace(Trace.Trace.custom(instr.__trace))
            const result = gen.next(yield instr as any)

            undo()

            return result
          } else {
            return gen.next(yield instr as any)
          }
        }

        while (!result.done) {
          result = yield* handleInstruction<Y, R>(gen, result.value)
        }

        return result.value
      }),
    )

function isTraced(x: unknown): x is { readonly __trace: string } {
  return !!x && typeof x === 'object' && '__trace' in x
}
