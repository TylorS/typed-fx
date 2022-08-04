import { Eff } from '../Eff.js'

import { ErrorsFromInstruction, Instruction } from './Instruction.js'

export interface ProcessorEff<Y, E, R> extends Eff<Instruction<Y, E, any>, R> {}

export type AnyProcessorEff =
  | ProcessorEff<any, any, any>
  | ProcessorEff<any, never, never>
  | ProcessorEff<any, never, any>
  | ProcessorEff<any, any, never>
  | ProcessorEff<never, any, any>
  | ProcessorEff<never, never, never>
  | ProcessorEff<never, never, any>
  | ProcessorEff<never, any, never>

export function ProcessorEff<Y, R>(
  f: () => Generator<Instruction<Y, any, any>, R>,
): ProcessorEff<Y, ErrorsFromInstruction<Y>, R> {
  return Eff(f)
}
