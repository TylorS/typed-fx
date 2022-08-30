import { constVoid } from 'hkt-ts'

import { AnyExit } from '@/Exit/Exit.js'
import { AnyLiveFiber } from '@/Fiber/Fiber.js'
import { AnyFx, Of, unit, zipAll } from '@/Fx/Fx.js'
import { AnyInstruction } from '@/Fx/Instruction.js'

export class Supervisor<A> {
  constructor(
    readonly value: Of<A>,
    readonly onStart: (fiber: AnyLiveFiber, fx: AnyFx) => void = constVoid,
    readonly onEnd: (fiber: AnyLiveFiber, exit: AnyExit) => void = constVoid,
    readonly onInstruction: (fiber: AnyLiveFiber, instruction: AnyInstruction) => void = constVoid,
    readonly onSuspended: (fiber: AnyLiveFiber) => void = constVoid,
    readonly onRunning: (fiber: AnyLiveFiber) => void = constVoid,
  ) {}

  readonly extend = <B = A>(
    overrides: Partial<{
      readonly [K in keyof Supervisor<A>]: (parent: Supervisor<A>[K]) => Supervisor<B>[K]
    }>,
  ): Supervisor<B> =>
    new Supervisor(
      (overrides.value ? overrides.value(this.value) : this.value) as Of<B>,
      overrides.onStart ? overrides.onStart(this.onStart) : this.onStart,
      overrides.onEnd ? overrides.onEnd(this.onEnd) : this.onEnd,
      overrides.onInstruction ? overrides.onInstruction(this.onInstruction) : this.onInstruction,
      overrides.onSuspended ? overrides.onSuspended(this.onSuspended) : this.onSuspended,
      overrides.onRunning ? overrides.onRunning(this.onRunning) : this.onRunning,
    )
}

export const None = new (class None extends Supervisor<any> {})(unit)
export type None = typeof None

export const isNone = <A>(supervisor: Supervisor<A>): supervisor is None => supervisor === None

export function and<B>(second: Supervisor<B>) {
  return <A>(first: Supervisor<A>) =>
    new Supervisor<readonly [A, B]>(
      zipAll([first.value, second.value]),
      (fiber, fx) => {
        first.onStart(fiber, fx)
        second.onStart(fiber, fx)
      },
      (fiber, exit) => {
        first.onEnd(fiber, exit)
        second.onEnd(fiber, exit)
      },
      (fiber, instr) => {
        first.onInstruction(fiber, instr)
        second.onInstruction(fiber, instr)
      },
      (fiber) => {
        first.onSuspended(fiber)
        second.onSuspended(fiber)
      },
      (fiber) => {
        first.onRunning(fiber)
        second.onRunning(fiber)
      },
    )
}
