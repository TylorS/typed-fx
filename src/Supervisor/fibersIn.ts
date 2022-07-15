import * as S from 'hkt-ts/Set'
import { Strict } from 'hkt-ts/Typeclass/Eq'

import { Supervisor } from './Supervisor'

import { Atomic } from '@/Atomic/Atomic'
import type { FiberRuntime } from '@/FiberRuntime/FiberRuntime'
import { fromLazy } from '@/Fx/lazy'

export function fibersIn(
  ref: Atomic<ReadonlySet<FiberRuntime<any, any, any>>> = new Atomic<
    ReadonlySet<FiberRuntime<any, any, any>>
  >(new Set(), S.makeEq(Strict)),
): Supervisor<ReadonlySet<FiberRuntime<any, any, any>>> {
  return new Supervisor(
    fromLazy(() => ref.get),
    (fiber) => fromLazy(() => ref.update((s) => new Set([...s, fiber]))),
    (fiber) =>
      fromLazy(() => ref.update(S.filter((x) => x.params.fiberId !== fiber.params.fiberId))),
  )
}
