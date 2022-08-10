import { Fx, fromLazy } from '../Fx/Fx.js'
import { Layer } from '../Layer/Layer.js'

import { AnyRef, ErrorsOf, OutputOf, ResourcesOf } from './Ref.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { InstanceOf } from '@/Service/index.js'

export function atomic<REF extends AnyRef>(
  ref: REF,
): Layer<ResourcesOf<REF>, ErrorsOf<REF>, InstanceOf<REF>> {
  return Layer<InstanceOf<REF>, ResourcesOf<REF>, ErrorsOf<REF>>(
    ref.id(),
    Fx(function* () {
      const atomic = Atomic(yield* ref.initial)
      const get = fromLazy(() => atomic.get())
      const modify = <B>(f: (a: OutputOf<REF>) => readonly [B, OutputOf<REF>]) =>
        fromLazy(() => atomic.modify(f))
      const api = new ref(get, modify)

      return api as InstanceOf<REF>
    }),
  )
}
