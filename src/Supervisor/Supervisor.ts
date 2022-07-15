import { constVoid } from 'hkt-ts'
import { Maybe } from 'hkt-ts/Maybe'

import { Atomic } from '@/Atomic/Atomic'
import { Exit } from '@/Exit/Exit'
import type { FiberContext } from '@/FiberContext/index'
import type { FiberRuntime } from '@/FiberRuntime/FiberRuntime'
import { Fx } from '@/Fx/Fx'
import { Instruction } from '@/Fx/InstructionSet/Instruction'

export class Supervisor<T> {
  constructor(
    readonly atomic: Atomic<T>,
    readonly onStart: <R, E, A>(
      runtime: FiberRuntime<R, E, A>,
      fx: Fx<R, E, A>,
      parent: Maybe<FiberContext>,
    ) => void = constVoid,
    readonly onEnd: <R, E, A>(runtime: FiberRuntime<R, E, A>, exit: Exit<E, A>) => void = constVoid,
    readonly onInstruction: <R, E, A>(
      runtime: FiberRuntime<R, E, A>,
      instruction: Instruction<R, E, A>,
    ) => void = constVoid,
    readonly onSuspend: <R, E, A>(runtime: FiberRuntime<R, E, A>) => void = constVoid,
    readonly onRunning: <R, E, A>(runtime: FiberRuntime<R, E, A>) => void = constVoid,
  ) {}
}
