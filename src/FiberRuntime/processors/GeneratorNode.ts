import { pipe } from 'hkt-ts'
import { Right } from 'hkt-ts/Either'
import { Just } from 'hkt-ts/Maybe'

import { FiberState } from '../FiberState.js'
import { ExitNode, GeneratorNode, InstructionNode } from '../RuntimeInstruction.js'
import { Done, Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { processFinalizerNode } from './FinalizerNode.js'

import { set } from '@/Atomic/Atomic.js'

export function processGeneratorNode<R, E, A>(
  node: GeneratorNode<R, E, A>,
  state: FiberState,
): readonly [RuntimeDecision<R, E, A>, FiberState] {
  const { generator, previous, method, next } = node
  const result = generator[method.get()](next.get())

  // Reset the Method to next
  pipe(method, set('next'))

  if (!result.done) {
    return [new Running(new InstructionNode(result.value, node)), state]
  }

  const exit = Right(result.value)

  switch (previous.tag) {
    case 'Initial':
      return [new Running(new ExitNode(exit)), state]
    case 'Exit':
      return [new Done(exit), state]
    case 'Finalizer': {
      previous.exit.modify(() => [null, Just(exit)])

      return processFinalizerNode(previous, state)
    }
    case 'Fx': {
      const prev = previous.previous.previous

      prev.next.modify(() => [null, result.value])

      return processGeneratorNode(prev, state)
    }
    case 'Instruction': {
      const prev = previous.previous

      prev.next.modify(() => [null, result.value])

      return processGeneratorNode(prev, state)
    }
  }
}
