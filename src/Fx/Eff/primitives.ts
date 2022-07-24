import { Lazy } from 'hkt-ts'

import { Trace } from '../Trace/Trace'

import { Eff } from './Eff'
import { AddTrace } from './Trace'

export function fromValue<A>(value: A, __trace?: string) {
  // eslint-disable-next-line require-yield
  return Eff(function* () {
    if (__trace) {
      yield* new AddTrace(Trace.custom(__trace))
    }

    return value
  })
}

export function fromLazy<A>(f: Lazy<A>, __trace?: string) {
  // eslint-disable-next-line require-yield
  return Eff(function* () {
    if (__trace) {
      yield* new AddTrace(Trace.custom(__trace))
    }

    return f()
  })
}
