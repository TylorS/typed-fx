import { ExtractErrors, ExtractResources, Ref } from './Ref'

import { Atomic } from '@/Atomic/Atomic'
import { Fx } from '@/Fx/Fx'
import { fromLazy } from '@/Fx/InstructionSet/index'
import * as Layer from '@/Layer/Layer'
import { Service } from '@/Service/Service'

export function provideAtomic<REF extends Ref<Service<any>, never, never>>(
  ref: REF,
): Layer.Layer<REF, ExtractResources<REF>, ExtractErrors<REF>> {
  return Layer.make(
    ref,
    Fx(function* () {
      const initial = yield* ref.initial
      const atomic = new Atomic(initial, ref.Eq)

      return ref.make<REF>({
        modify: (f) => fromLazy(() => atomic.modify(f)),
      })
    }),
  )
}
