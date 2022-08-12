import { pipe } from 'hkt-ts'
import { Right } from 'hkt-ts/Either'
import { Just } from 'hkt-ts/Maybe'

import { FiberState } from '../FiberState.js'
import { ExitNode, GeneratorNode, InstructionNode } from '../RuntimeInstruction.js'
import { Done, Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { processFinalizerNode } from './FinalizerNode.js'
import { processPopNode } from './PopNode.js'

import { set } from '@/Atomic/Atomic.js'
import { Trace } from '@/Trace/Trace.js'

export function processGeneratorNode(
  node: GeneratorNode,
  state: FiberState,
): readonly [RuntimeDecision, FiberState] {
  const { generator, previous, method, next } = node
  const result = generator[method.get()](next.get())

  // Reset the Method to next
  pipe(method, set('next'))

  if (!result.done) {
    const instr = result.value
    // Ammend the
    const updatedState: FiberState = instr.__trace
      ? {
          ...state,
          trace: state.trace.push(Trace.custom(instr.__trace)),
        }
      : state

    return [
      new Running(new InstructionNode(instr, node, instr.__trace ? popTrace : undefined)),
      updatedState,
    ]
  }

  const exit = Right(result.value)

  switch (previous.tag) {
    case 'Initial':
      return [new Running(new ExitNode(exit)), state]
    case 'Exit': {
      return [new Done(previous.exit), state]
    }
    case 'Finalizer': {
      previous.exit.modify(() => [null, Just(exit)])

      return processFinalizerNode(previous, state)
    }
    case 'Fx': {
      const prev = previous.previous.previous

      prev.next.modify(() => [null, result.value])

      return processGeneratorNode(prev, state)
    }
    case 'Generator': {
      previous.next.modify(() => [null, result.value])

      return processGeneratorNode(previous, state)
    }
    case 'Instruction': {
      const prev = previous.previous

      prev.next.modify(() => [null, result.value])

      return processGeneratorNode(prev, previous.pop(state))
    }
    case 'Pop': {
      previous.exit.modify(() => [null, Just(exit)])

      return processPopNode(previous, state)
    }
  }
}

function popTrace(state: FiberState): FiberState {
  return { ...state, trace: state.trace.pop() ?? state.trace }
}
