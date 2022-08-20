import { Fx } from '../Fx.js'

import { FxInstruction } from './FxInstruction.js'

import type { FiberRef } from '@/FiberRef/FiberRef.js'
import type { FiberRefs } from '@/FiberRefs/index.js'

export class ModifyFiberRef<R, E, A, B> extends FxInstruction<
  readonly [FiberRef<R, E, A>, (a: A) => Fx<R, E, readonly [B, A]>],
  never,
  never,
  FiberRefs
> {
  static tag = 'ModifyFiberRef' as const
  readonly tag = ModifyFiberRef.tag
}
