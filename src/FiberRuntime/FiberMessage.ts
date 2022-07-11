import { FiberRuntime } from './FiberRuntime'

import { Cause } from '@/Cause/Cause'
import { Fx } from '@/Fx/Fx'
import { Service } from '@/Service/Service'
import { StackTrace } from '@/StackTrace/StackTrace'

export type FiberMessage<R extends Service<any>, E, A> =
  | InterruptSignal
  | GenerateStackTrace
  | WithRuntime<R, E, A>
  | Resume<R, E, A>
  | Yield

export class InterruptSignal {
  readonly tag = 'InterruptSignal'

  constructor(readonly cause: Cause<never>) {}
}

export class GenerateStackTrace {
  readonly tag = 'GenerateStackTrace'

  constructor(readonly onTrace: (trace: StackTrace) => void) {}
}

export class WithRuntime<R extends Service<any>, E, A> {
  readonly tag = 'WithRuntime'

  constructor(readonly withRuntime: (runtime: FiberRuntime<R, E, A>) => void) {}
}

export class Resume<R extends Service<any>, E, A> {
  readonly tag = 'Resume'

  constructor(readonly fx: Fx<R, E, A>) {}
}

export class Yield {
  readonly tag = 'Yield'
}
