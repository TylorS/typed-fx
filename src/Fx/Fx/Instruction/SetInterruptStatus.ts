import { Eff } from '@/Fx/Eff/Eff.js'
import { Fx } from '@/Fx/Fx/Fx.js'

export class SetInterruptStatus<R, E, A> extends Eff.Instruction<
  readonly [fx: Fx<R, E, A>, interruptStatus: boolean],
  A
> {
  readonly tag = 'SetInterruptStatus'
}

export const uninterruptible = <R, E, A>(fx: Fx<R, E, A>, __trace?: string): Fx<R, E, A> =>
  new SetInterruptStatus([fx, false], __trace)

export const interruptible = <R, E, A>(fx: Fx<R, E, A>, __trace?: string): Fx<R, E, A> =>
  new SetInterruptStatus([fx, true], __trace)
