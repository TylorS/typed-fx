import { Future } from '@/Future/Future.js'
import { FxInstruction } from '@/Fx/Instructions/FxInstruction.js'

export class Wait<R, E, A> extends FxInstruction<Future<R, E, A>, R, E, A> {
  static tag = 'Wait' as const
  readonly tag = Wait.tag
}
