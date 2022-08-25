import * as Exit from '@/Exit/Exit.js'
import * as Fx from '@/Fx/Fx.js'

export type Frame = ExitFrame | ValueFrame

export interface ExitFrame {
  readonly tag: 'Exit'
  readonly step: (exit: Exit.AnyExit) => Fx.AnyFx
}

export function ExitFrame(step: (a: Exit.AnyExit) => Fx.AnyFx): ExitFrame {
  return {
    tag: 'Exit',
    step,
  }
}

export interface ValueFrame {
  readonly tag: 'Value'
  readonly step: (a: any) => Fx.AnyFx
}

export function ValueFrame(step: (a: any) => Fx.AnyFx): ValueFrame {
  return {
    tag: 'Value',
    step,
  }
}
