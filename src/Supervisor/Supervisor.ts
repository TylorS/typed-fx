import { constant } from 'hkt-ts'

import { Exit } from '@/Exit/Exit.js'
import { AnyLiveFiber } from '@/Fiber/Fiber.js'
import { AnyFx, Of, unit } from '@/Fx/Fx.js'
import { AnyInstruction } from '@/Fx/Instructions/Instruction.js'

const lazyUnit = constant(unit)

export class Supervisor<A> {
  constructor(
    readonly value: Of<A>,
    readonly onStart: (fiber: AnyLiveFiber, fx: AnyFx) => Of<void> = lazyUnit,
    readonly onEnd: (fiber: AnyLiveFiber, exit: Exit<any, any>) => Of<void> = lazyUnit,
    readonly onInstruction: (
      fiber: AnyLiveFiber,
      instruction: AnyInstruction,
    ) => Of<void> = lazyUnit,
    readonly onSuspended: (fiber: AnyLiveFiber) => Of<void> = lazyUnit,
    readonly onRunning: (fiber: AnyLiveFiber) => Of<void> = lazyUnit,
  ) {}
}
