import { Maybe, pipe } from 'hkt-ts'

import { Effect } from './Effect.js'
import { EffectRef } from './EffectRef.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Stack } from '@/Stack/index.js'

export interface EffectRefs {
  readonly locals: Atomic<EffectRefLocals>
  readonly fork: () => EffectRefs
}

export interface EffectRefLocals extends ImmutableMap<EffectRef<any, any, any>, Stack<any>> {}

export function EffectRefs(locals: EffectRefLocals = EffectRefLocals()): EffectRefs {
  const refs: EffectRefs = {
    locals: Atomic(locals),
    fork: () => EffectRefs.fork(refs),
  }

  return refs
}

export function EffectRefLocals(): EffectRefLocals {
  return ImmutableMap()
}

export namespace EffectRefs {
  export function pushLocal<Fx extends Effect.AnyIO, E, A>(
    refs: EffectRefs,
    ref: EffectRef<Fx, E, A>,
    value: A,
  ): Stack<A> {
    const locals = refs.locals.get()
    const updated = pipe(
      locals.get(ref),
      Maybe.match(
        () => new Stack(value),
        (s) => s.push(value),
      ),
    )

    locals.set(ref, updated)

    return updated
  }

  export function popLocal<Fx extends Effect.AnyIO, E, A>(
    refs: EffectRefs,
    ref: EffectRef<Fx, E, A>,
  ): Maybe.Maybe<Stack<A>> {
    const locals = refs.locals.get()

    return pipe(
      locals.get(ref),
      Maybe.match(
        () => Maybe.Nothing,
        (s) => {
          const popped = s.pop()

          locals.set(ref, popped ?? s)

          return Maybe.fromNullable(popped)
        },
      ),
    )
  }

  export function fork(refs: EffectRefs): EffectRefs {
    const updated = new Map<EffectRef<any, any, any>, Stack<any>>()

    for (const [key, stack] of refs.locals.get()) {
      const forked = key.fork(stack.value)

      if (Maybe.isJust(forked)) {
        updated.set(key, forked.value)
      }
    }

    return EffectRefs(ImmutableMap(updated))
  }
}
