import { FiberRef } from './FiberRef'

import { Fx } from '@/Fx/Fx'
import { getFiberContext } from '@/Fx/InstructionSet/GetFiberContext'

export function modify<A, R2, E2, B>(f: (a: A) => Fx<R2, E2, readonly [B, A]>) {
  return <R, E>(ref: FiberRef<R, E, A>): Fx<R | R2, E | E2, B> =>
    Fx(function* () {
      const { fiberRefs } = yield* getFiberContext

      return yield* fiberRefs.modify(ref, f)
    })
}
