import { AnyRefConstructor, ErrorsOf, OutputOf, ResourcesOf } from './Ref.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { Fx, fromLazy } from '@/Fx/Fx.js'
import { Layer } from '@/Layer/Layer.js'
import { Lock, acquire } from '@/Semaphore/Semaphore.js'
import { InstanceOf } from '@/Service/index.js'

export function atomic<REF extends AnyRefConstructor>(
  ref: REF,
): Layer<ResourcesOf<REF>, ErrorsOf<REF>, InstanceOf<REF>> {
  return Layer(
    ref.id(),
    Fx(function* () {
      const atomic = Atomic(yield* ref.initial)
      const get = fromLazy(atomic.get)
      const locked = acquire(new Lock())
      const modify = <R2, E2, B>(
        f: (a: OutputOf<REF>) => Fx<R2, E2, readonly [B, OutputOf<REF>]>,
      ): Fx<R2, E2, B> =>
        locked(
          Fx(function* () {
            const computed = yield* f(atomic.get())

            return atomic.modify(() => computed)
          }),
        )

      return new ref(get as InstanceOf<REF>['get'], modify)
    }),
  )
}
