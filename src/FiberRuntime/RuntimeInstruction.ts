// Instruction
// Add/Remove Child

import { NonNegativeInteger } from 'hkt-ts/number'

import { Cause } from '@/Cause/Cause'
import { Env } from '@/Env/Env'
import { Exit } from '@/Exit/Exit'
import { AnyInstruction } from '@/Fx/InstructionSet/Instruction'

export type RuntimeInstruction<E> =
  | Done<E>
  | Fail<E>
  | YieldNow
  | Suspend
  | Resume
  | PushInterruptStatus
  | PopInterruptStatus
  | GetInterruptStatus
  | PushConcurrencyLevel
  | PopConcurrencyLevel
  | GetConcurrencyLevel
  | PushTrace
  | PopTrace
  | GetTrace
  | PushEnvironment
  | PopEnvironment
  | GetEnvironment
  | GetCurrentFiberContext
  | OnInstruction

export class Done<E> {
  readonly tag = 'Done'
  constructor(readonly exit: Exit<E, any>) {}
}

export class Fail<E> {
  readonly tag = 'Fail'

  constructor(readonly cause: Cause<E>) {}
}

export class YieldNow {
  readonly tag = 'YieldNow'
}

export class Suspend {
  readonly tag = 'Suspend'
}

export class Resume {
  readonly tag = 'Resume'

  constructor(readonly id: symbol) {}
}

export class PushInterruptStatus {
  readonly tag = 'PushInterruptStatus'

  constructor(readonly interruptStatus: boolean) {}
}

export class PopInterruptStatus {
  readonly tag = 'PopInterruptStatus'
}

export class GetInterruptStatus {
  readonly tag = 'GetInterruptStatus'
}

export class PushConcurrencyLevel {
  readonly tag = 'PushConcurrencyLevel'

  constructor(readonly concurrencyLevel: NonNegativeInteger) {}
}

export class PopConcurrencyLevel {
  readonly tag = 'PopConcurrencyLevel'
}

export class GetConcurrencyLevel {
  readonly tag = 'GetConcurrencyLevel'
}

export class PushTrace {
  readonly tag = 'PushTrace'

  constructor(readonly trace: string) {}
}

export class PopTrace {
  readonly tag = 'PopTrace'
}

export class GetTrace {
  readonly tag = 'GetTrace'
}

export class PushEnvironment {
  readonly tag = 'PushEnvironment'

  constructor(readonly env: Env<any>) {}
}

export class PopEnvironment {
  readonly tag = 'PopEnvironment'
}

export class GetEnvironment {
  readonly tag = 'GetEnvironment'
}

export class GetCurrentFiberContext {
  readonly tag = 'GetCurrentFiberContext'
}

export class OnInstruction {
  readonly tag = 'OnInstruction'

  constructor(readonly instruction: AnyInstruction) {}
}
