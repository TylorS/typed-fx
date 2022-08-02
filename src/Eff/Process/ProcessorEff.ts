import { Eff } from '../Eff.js'
import { Failure } from '../Instructions/Failure.js'

import { AnyInstruction, ErrorsFromInstruction, Instruction } from './Instruction.js'

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

export function ProcessorEff<Y extends AnyInstruction, R>(
  f: () => Generator<Y, R>,
): ProcessorEff<Exclude<Y, Failure<any> | Failure<never>>, ErrorsFromInstruction<Y>, R> {
  return Eff(f)
}
