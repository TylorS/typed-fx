import * as S from 'hkt-ts/Set'

import { Supervisor } from './Supervisor'

import { Atomic } from '@/Atomic/Atomic'
import type { FiberRuntime } from '@/FiberRuntime/FiberRuntime'
import { fromLazy } from '@/Fx/index'

export function fibersIn(ref: Atomic<ReadonlySet<FiberRuntime<any, any, any>>>): Supervisor {
  return new Supervisor(
    fromLazy(() => ref.get),
    (fiber) => fromLazy(() => ref.update((s) => new Set([...s, fiber]))),
    (fiber) =>
      fromLazy(() => ref.update(S.filter((x) => x.params.fiberId !== fiber.params.fiberId))),
  )
}
