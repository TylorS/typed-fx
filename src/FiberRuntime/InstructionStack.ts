import { Exit } from '@/Exit/Exit'

export type FiberInstruction = InitialInstruction

export class InitialInstruction {
  readonly tag = 'Initial'
}

export class ExitInstruction {
  readonly tag = 'Exit'

  constructor(readonly exit: Exit<any, any>) {}
}
