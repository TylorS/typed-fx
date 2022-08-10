import { Eff } from '@/Eff/Eff.js'

export abstract class FxInstruction<I, R, E, A> extends Eff.Instruction<I, A> {
  readonly __R!: () => R
  readonly __E!: () => E
  readonly __A!: () => A
}
