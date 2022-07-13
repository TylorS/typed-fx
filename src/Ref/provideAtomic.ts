import * as Ref from './Ref'

import { Atomic } from '@/Atomic/Atomic'
import { Fx } from '@/Fx/Fx'
import { fromLazy } from '@/Fx/InstructionSet/index'
import * as Layer from '@/Layer/Layer'
import { InstanceOf } from '@/internal'

export function provideAtomic<R extends Ref.AnyRef>(
  ref: R,
): Layer.Layer<R, Ref.ResourcesOf<R>, Ref.ErrorsOf<R>> {
  return Layer.make(
    ref,
    Fx(function* () {
      const initial = yield* ref.initial
      const atomic = new Atomic(initial, ref.Eq)

      return ref.make((f) => fromLazy(() => atomic.modify(f))) as InstanceOf<R>
    }),
  )
}
