import { Eff } from '../Eff.js'

export class SetInterruptStatus<Y, R> extends Eff.Instruction<
  readonly [eff: Eff<Y, R>, interruptStatus: boolean],
  R
> {
  readonly tag = 'SetInterruptStatus'
}

export const uninterruptable = <Y, R>(
  fx: Eff<Y, R>,
  __trace?: string,
): Eff<Y | SetInterruptStatus<Y, R>, R> => new SetInterruptStatus([fx, false], __trace)

export const interruptable = <Y, R>(
  fx: Eff<Y, R>,
  __trace?: string,
): Eff<Y | SetInterruptStatus<Y, R>, R> => new SetInterruptStatus([fx, true], __trace)
