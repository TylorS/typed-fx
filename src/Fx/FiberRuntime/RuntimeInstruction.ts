import { Either } from 'hkt-ts'

import { Eff } from '../Eff/Eff.js'
import { Failure } from '../Eff/Failure.js'

export interface RuntimeIterable<Ctx, T, E, A> extends Eff<RuntimeInstruction<Ctx, T, E, any>, A> {}

export type RuntimeInstruction<Ctx, T, E, A> =
  | GetContext
  | PushContext<Ctx>
  | PopContext
  | ModifyContext<Ctx>
  | RuntimePromise<A>
  | RuntimeAsync<T>
  | Failure<E>
  | PushInstruction<T>
  | ScheduleCallback

export class RuntimePromise<A> {
  readonly tag = 'Promise'

  constructor(readonly promise: () => Promise<A>) {}
}

export class RuntimeAsync<T> {
  readonly tag = 'Async'

  constructor(readonly register: (cb: (value: T) => void) => Either.Either<T, T>) {}
}

export class GetContext {
  readonly tag = 'GetContext'
}

export class PushContext<Ctx> {
  readonly tag = 'PushContext'

  constructor(readonly context: Ctx) {}
}

export class ModifyContext<Ctx> {
  readonly tag = 'ModifyContext'

  constructor(readonly context: Ctx) {}
}

export class PopContext {
  readonly tag = 'PopContext'
}

export class PushInstruction<T> {
  readonly tag = 'PushInstruction'

  constructor(readonly eff: T) {}
}

export class ScheduleCallback {
  readonly tag = 'ScheduleCallback'

  constructor(readonly cb: () => void) {}
}
