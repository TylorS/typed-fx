import { constant } from 'hkt-ts'

import { Cause } from '@/Cause/Cause'
import { Of } from '@/Fx/Fx'
import { success } from '@/Fx/index'

export abstract class Sink<E, A> {
  abstract readonly event: (a: A) => Of<unknown>
  abstract readonly error: (cause: Cause<E>) => Of<unknown>
  abstract readonly end: Of<unknown>
}

const InternalSink = Sink

const unit = success<void>(undefined)
const lazyUnit = constant(unit)

export type SinkEffects<E, A> = {
  readonly event?: (a: A) => Of<unknown>
  readonly error?: (cause: Cause<E>) => Of<unknown>
  readonly end?: Of<unknown>
}

export function make<E, A>(effects: SinkEffects<E, A>) {
  return class Sink extends InternalSink<E, A> {
    readonly event = effects.event ?? lazyUnit
    readonly error = effects.error ?? lazyUnit
    readonly end = effects.end ?? unit
  }
}
