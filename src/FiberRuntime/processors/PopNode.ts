import { pipe } from 'hkt-ts'
import { match } from 'hkt-ts/Either'
import { isNothing } from 'hkt-ts/Maybe'

import { FiberState } from '../FiberState.js'
import { GeneratorNode, PopNode } from '../RuntimeInstruction.js'
import { Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { set } from '@/Atomic/Atomic.js'
import { CauseError } from '@/Cause/CauseError.js'
import { Eff } from '@/Eff/Eff.js'

export function processPopNode(
  node: PopNode,
  state: FiberState,
): readonly [RuntimeDecision, FiberState] {
  const exit = node.exit.get()

  if (isNothing(exit)) {
    return [new Running(new GeneratorNode(Eff.gen(node.fx as any), node)), state]
  }

  const previous = node.previous.previous

  // Update the Previous Node with the Exit value
  pipe(
    exit.value,
    match(
      (cause) => {
        pipe(previous.method, set('throw'))
        pipe(previous.next, set(new CauseError(cause)))
      },
      (value) => {
        pipe(previous.method, set('next'))
        pipe(previous.next, set(value))
      },
    ),
  )

  return [new Running(previous), node.pop(state)]
}
