/* eslint-disable @typescript-eslint/ban-types */
import { Eff } from './Eff.js'

import { StackTrace } from '@/Fx/StackTrace/StackTrace.js'
import { Trace } from '@/Fx/Trace/Trace.js'

export class AddTrace implements Eff<AddTrace, void, void> {
  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor(readonly trace: Trace) {}

  *[Symbol.iterator]() {
    return (yield this) as void
  }
}

export const addTrace = (trace: Trace) => new AddTrace(trace)

export class GetTrace implements Eff<GetTrace, Trace, Trace> {
  *[Symbol.iterator]() {
    return (yield this) as Trace
  }
}

export const getTrace = new GetTrace()

export function withTracing<Y, R, N>(
  eff: Eff<Y | AddTrace | GetTrace, R, N | Trace | Function>,
): Eff<Exclude<Y, AddTrace | GetTrace>, readonly [R, Trace], Exclude<N, Trace>> {
  return Eff(function* tracing() {
    const gen = eff[Symbol.iterator]()

    let result = gen.next()
    let trace = new StackTrace()

    trace = trace.push(Trace.runtime({}, tracing))

    while (!result.done) {
      const instr = result.value

      if (instr instanceof AddTrace) {
        if (instr.trace.tag === 'StackFrameTrace') {
          trace = trace.trimExisting(instr.trace.frames)
        }

        result = gen.next()
      } else if (instr instanceof GetTrace) {
        result = gen.next(trace.flatten())
      } else {
        result = gen.next((yield instr as Exclude<Y, AddTrace | GetTrace>) as N)
      }
    }

    return [result.value, trace.flatten()] as const
  })
}
