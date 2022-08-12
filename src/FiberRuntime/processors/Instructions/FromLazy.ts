import { pipe } from 'hkt-ts'

import { set } from '@/Atomic/Atomic.js'
import { FiberState } from '@/FiberRuntime/FiberState.js'
import { InstructionNode } from '@/FiberRuntime/RuntimeInstruction.js'
import { Running, RuntimeUpdate } from '@/FiberRuntime/RuntimeProcessor.js'
import { FromLazy } from '@/Fx/Instructions/FromLazy.js'

export function processFromLazy<A>(
  fromLazy: FromLazy<A>,
  state: FiberState,
  node: InstructionNode,
): RuntimeUpdate {
  pipe(node.previous.next, set(fromLazy.input()))

  return [new Running(node.previous), state]
}
