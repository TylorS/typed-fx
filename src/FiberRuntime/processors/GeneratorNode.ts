import { Right } from 'hkt-ts/Either'
import { Just, Nothing } from 'hkt-ts/Maybe'

import { FiberState } from '../FiberState.js'
import { ExitNode, GeneratorNode, InstructionNode } from '../RuntimeInstruction.js'
import { Done, Running, RuntimeDecision } from '../RuntimeProcessor.js'

import { processFinalizerNode } from './FinalizerNode.js'
import { processPopNode } from './PopNode.js'

import { Trace } from '@/Trace/Trace.js'

export function processGeneratorNode(
  node: GeneratorNode,
  state: FiberState,
): readonly [RuntimeDecision, FiberState] {
  const { generator, previous, method, next, cause } = node
  const result = generator[method.get()](next.get())

  // Reset Failures since we made it to the next instruction w/o throwing
  method.set('next')
  cause.set(Nothing)

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
      previous.exit.set(Just(exit))

      return processFinalizerNode(previous, state)
    }
    case 'Fx': {
      const prev = previous.previous.previous

      prev.next.set(result.value)

      return processGeneratorNode(prev, state)
    }
    case 'Generator': {
      previous.next.set(result.value)

      return processGeneratorNode(previous, state)
    }
    case 'Instruction': {
      const prev = previous.previous

      prev.next.set(result.value)

      return processGeneratorNode(prev, previous.pop(state))
    }
    case 'Pop': {
      previous.exit.set(Just(exit))

      return processPopNode(previous, state)
    }
    case 'Failure': {
      throw new Error(
        `Bug in @typed/fx. A FailureNode should never create new instructions directly.`,
      )
    }
  }
}

function popTrace(state: FiberState): FiberState {
  return { ...state, trace: state.trace.pop() ?? state.trace }
}
