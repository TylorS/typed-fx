import { pipe } from 'hkt-ts'
import { isJust } from 'hkt-ts/Maybe'

import { Fiber } from './Fiber.js'
import type { FiberRef, FiberRefId } from './FiberRef.js'

import { Atomic, modify } from '@/Atomic/Atomic.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'

export interface FiberRefLocals {
  // It is possible to create multiple FiberRefs, but the last used FiberRef
  // will be kept here to provide fork/join capabilities.
  readonly refs: Atomic<ImmutableMap<FiberRefId, FiberRef<any, any, any>>>
  readonly values: Atomic<ImmutableMap<FiberRefId, any>>
  readonly initializing: Atomic<ImmutableMap<FiberRefId, Fiber<any, any>>>

  readonly getAll: () => ImmutableMap<FiberRef<any, any, any>, any>
}

export function FiberRefLocals(
  locals: ImmutableMap<FiberRef<any, any, any>, any> = ImmutableMap(),
  initializingFibers: ImmutableMap<FiberRefId, Fiber<any, any>> = ImmutableMap(),
): FiberRefLocals {
  const refs = Atomic(ImmutableMap(new Map(Array.from(locals).map(([k]) => [k.id, k] as const))))
  const values = Atomic(
    ImmutableMap(new Map(Array.from(locals).map(([k, v]) => [k.id, v] as const))),
  )
  const initializing = Atomic(initializingFibers)

  return {
    refs,
    values,
    initializing,
    getAll: function () {
      const refsToValues = new Map<FiberRef<any, any, any>, any>()

      const idsToRefs_ = refs.get()
      const idsToValues_ = values.get()

      for (const [id, ref] of idsToRefs_) {
        const maybe = idsToValues_.get(id)

        if (isJust(maybe)) {
          refsToValues.set(ref, maybe.value)
        } else {
          pipe(
            refs,
            modify((s) => [null, s.remove(ref.id)]),
          )
        }
      }

      return ImmutableMap(refsToValues)
    },
  }
}
