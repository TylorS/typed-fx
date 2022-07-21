import { OnInstruction, PopTrace, PushTrace } from '../RuntimeInstruction'
import { RuntimeIterable } from '../RuntimeIterable'

import { processAccess } from './Access'
import { processAsync } from './Async'
import { processFork } from './Fork'
import { processFromExit } from './FromExit'
import { processProvide } from './Provide'
import { processSetInterruptible } from './SetInterruptible'
import { processWithConcurrency } from './WithConcurrency'
import { processZipAll } from './ZipAll'

import { FiberContext } from '@/FiberContext/index'
import { Fx } from '@/Fx/Fx'
import { Access } from '@/Fx/InstructionSet/Access'
import { Async } from '@/Fx/InstructionSet/Async'
import { Fork } from '@/Fx/InstructionSet/Fork'
import { FromExit } from '@/Fx/InstructionSet/FromExit'
import { GetFiberContext } from '@/Fx/InstructionSet/GetFiberContext'
import { Instruction } from '@/Fx/InstructionSet/Instruction'
import { Provide } from '@/Fx/InstructionSet/Provide'
import { SetInterruptible } from '@/Fx/InstructionSet/SetInterruptable'
import { WithConcurrency } from '@/Fx/InstructionSet/WithConcurrency'
import { ZipAll } from '@/Fx/InstructionSet/ZipAll'

export function* processFx<R, E, A>(
  fx: Fx<R, E, A>,
  getContext: () => FiberContext,
): RuntimeIterable<E, A> {
  const generator = fx[Symbol.iterator]() as Generator<Instruction<R, E, any>, A>
  let result = generator.next()

  while (!result.done) {
    const instr = result.value
    const hasTrace = !!instr.trace

    yield new OnInstruction(instr)

    if (hasTrace) {
      yield new PushTrace(instr.trace)
    }

    try {
      result = generator.next(yield* processInstruction(instr, getContext))
    } catch (e) {
      result = generator.throw(e)
    }

    if (hasTrace) {
      yield new PopTrace()
    }
  }

  return result.value
}

export function* processInstruction<R, E, A>(
  instr: Instruction<R, E, A>,
  getContext: () => FiberContext,
): RuntimeIterable<E, any> {
  if (instr.is<typeof FromExit<E, any>>(FromExit)) {
    return yield* processFromExit(instr)
  }

  if (instr.is<typeof Async<R, E, any>>(Async)) {
    return yield* processAsync(instr, (fx) => processFx(fx, getContext))
  }

  if (instr.is<typeof Access<R, R, E, any>>(Access)) {
    return yield* processAccess(instr, (fx) => processFx(fx, getContext))
  }

  if (instr.is<typeof Provide<R, E, any>>(Provide)) {
    return yield* processProvide(instr, (fx) => processFx(fx, getContext))
  }

  if (instr.is(GetFiberContext)) {
    return getContext()
  }

  if (instr.is(SetInterruptible)) {
    return yield* processSetInterruptible(instr, (fx) => processFx(fx, getContext))
  }

  if (instr.is(WithConcurrency)) {
    return yield* processWithConcurrency(instr, (fx) => processFx(fx, getContext))
  }

  if (instr.is(ZipAll)) {
    return yield* processZipAll(instr, (fx) => processFx(fx, getContext))
  }

  if (instr.is<typeof Fork<R, E, A>>(Fork)) {
    return yield* processFork(instr, (fx) => processFx(fx, getContext))
  }

  throw new Error(`Unknown Instruction ecountered: ${JSON.stringify(instr, null, 2)}`)
}
