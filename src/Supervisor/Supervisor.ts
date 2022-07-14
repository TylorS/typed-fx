import { Maybe } from 'hkt-ts/Maybe'

import { Exit } from '@/Exit/Exit'
import type { FiberContext } from '@/FiberContext/index'
import type { FiberRuntime } from '@/FiberRuntime/FiberRuntime'
import { Fx, Of } from '@/Fx/Fx'
import { Instruction, unit } from '@/Fx/index'

export class Supervisor {
  constructor(
    readonly value: Of<ReadonlySet<FiberRuntime<any, any, any>>>,
    readonly onStart: <R, E, A>(
      runtime: FiberRuntime<R, E, A>,
      fx: Fx<R, E, A>,
      parent: Maybe<FiberContext>,
    ) => Of<unknown> = () => unit,
    readonly onEnd: <R, E, A>(
      runtime: FiberRuntime<R, E, A>,
      exit: Exit<E, A>,
    ) => Of<unknown> = () => unit,
    readonly onInstruction: <R, E, A>(
      runtime: FiberRuntime<R, E, A>,
      instruction: Instruction<R, E, A>,
    ) => Of<unknown> = () => unit,
    readonly onSuspend: <R, E, A>(runtime: FiberRuntime<R, E, A>) => Of<unknown> = () => unit,
    readonly onRunning: <R, E, A>(runtime: FiberRuntime<R, E, A>) => Of<unknown> = () => unit,
  ) {}
}
