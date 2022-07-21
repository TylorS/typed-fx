import { FiberRef } from './FiberRef'

import { Fx } from '@/Fx/Fx'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'

export function get<R, E, A>(ref: FiberRef<R, E, A>): Fx<R, E, A> {
  return Fx(function* () {
    const { fiberRefs } = yield* getFiberContext

    return yield* fiberRefs.get(ref)
  })
}
