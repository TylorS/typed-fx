import { isJust } from 'hkt-ts/Maybe'

import type { FiberRef, FiberRefId } from './FiberRef.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'

export interface FiberRefLocals {
  // It is possible to create multiple FiberRefs
  readonly idsToRefs: Atomic<ImmutableMap<FiberRefId, FiberRef<any, any, any>>>
  readonly idsToValues: Atomic<ImmutableMap<FiberRefId, any>>

  readonly getAll: () => ReadonlyMap<FiberRef<any, any, any>, any>
}

export function FiberRefLocals(
  locals: ReadonlyMap<FiberRef<any, any, any>, any> = new Map(),
): FiberRefLocals {
  const idsToRefs: ImmutableMap<FiberRefId, FiberRef<any, any, any>> = ImmutableMap(
    new Map(Array.from(locals).map(([k]) => [k.id, k] as const)),
  )
  const idsToValues = ImmutableMap(new Map(Array.from(locals).map(([k, v]) => [k.id, v] as const)))

  return {
    idsToRefs: Atomic(idsToRefs),
    idsToValues: Atomic(idsToValues),
    getAll: () => {
      const refsToValues = new Map<FiberRef<any, any, any>, any>()

      for (const [id, ref] of idsToRefs) {
        const maybe = idsToValues.get(id)

        if (isJust(maybe)) {
          refsToValues.set(ref, maybe.value)
        }
      }

      return refsToValues
    },
  }
}
