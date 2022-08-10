import { AnyRefConstructor, ErrorsOf, OutputOf, ResourcesOf } from './Ref.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { Fx, Of, fromLazy } from '@/Fx/Fx.js'
import { Layer } from '@/Layer/Layer.js'
import { InstanceOf } from '@/Service/index.js'

export function atomic<REF extends AnyRefConstructor>(
  ref: REF,
): Layer<ResourcesOf<REF>, ErrorsOf<REF>, InstanceOf<REF>> {
  return Layer(
    ref.id(),
    Fx(function* () {
      const atomic = Atomic(yield* ref.initial)
      const get = fromLazy(atomic.get)
      const modify = <B>(f: (a: OutputOf<REF>) => readonly [B, OutputOf<REF>]): Of<B> =>
        fromLazy(() => atomic.modify(f))

      return new ref(get, modify)
    }),
  )
}
