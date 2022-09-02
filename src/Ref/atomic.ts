import { pipe } from 'hkt-ts'

import { AnyRef, ErrorsOf, OutputOf, ResourcesOf } from './Ref.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { Fx, fromLazy, lazy, map } from '@/Fx/Fx.js'
import { Layer } from '@/Layer/Layer.js'
import { Lock, acquire } from '@/Semaphore/Semaphore.js'
import { InstanceOf, Service } from '@/Service/index.js'

export function atomic<REF extends AnyRef>(
  ref: REF,
): Layer<ResourcesOf<REF>, ErrorsOf<REF>, InstanceOf<REF>> {
  const service = ref.id() as Service<InstanceOf<REF>>

  return Layer(service, () =>
    Fx(function* () {
      const atomic = Atomic(yield* ref.initial)
      const get = fromLazy(atomic.get)
      const locked = acquire(new Lock())
      const modify = <R2, E2, B>(
        f: (a: OutputOf<REF>) => Fx<R2, E2, readonly [B, OutputOf<REF>]>,
      ): Fx<R2, E2, B> =>
        pipe(
          lazy(() => f(atomic.get())),
          map((computed) => atomic.modify(() => computed)),
          locked,
        )

      return new ref(get, modify) as InstanceOf<REF>
    }),
  )
}
