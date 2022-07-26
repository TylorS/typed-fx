import { Lazy } from 'hkt-ts'

import { Eff } from './Eff.js'
import { AddTrace } from './Trace.js'

import { Trace } from '@/Fx/Trace/Trace.js'

export function fromValue<A>(value: A, __trace?: string): Eff<AddTrace, A> {
  // eslint-disable-next-line require-yield
  return Eff(function* () {
    if (__trace) {
      yield* new AddTrace(Trace.custom(__trace))
    }

    return value
  })
}

export function fromLazy<A>(f: Lazy<A>, __trace?: string): Eff<AddTrace, A> {
  // eslint-disable-next-line require-yield
  return Eff(function* () {
    if (__trace) {
      yield* new AddTrace(Trace.custom(__trace))
    }

    return f()
  })
}
