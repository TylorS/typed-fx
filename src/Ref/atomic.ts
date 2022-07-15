import * as Ref from './Ref'

import { Atomic } from '@/Atomic/Atomic'
import { Fx } from '@/Fx/Fx'
import { fromLazy } from '@/Fx/lazy'
import * as Layer from '@/Layer/Layer'
import * as Semaphore from '@/Semaphore/Semaphore'

export function atomic<R extends Ref.AnyRef>(
  ref: R,
): Layer.Layer<R, Ref.ResourcesOf<R>, Ref.ErrorsOf<R>> {
  return (ref as R).layer(
    Fx(function* () {
      const initial = yield* ref.initial
      const atomic = new Atomic(initial, ref.Eq)
      const acquire = Semaphore.acquire(new Semaphore.Lock())

      return (ref as R).make((f) => acquire(fromLazy(() => atomic.modify(f))))
    }),
  )
}
