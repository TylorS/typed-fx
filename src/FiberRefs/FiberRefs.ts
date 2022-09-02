import { flow, pipe } from 'hkt-ts'
import * as Maybe from 'hkt-ts/Maybe'

import { Atomic } from '@/Atomic/Atomic.js'
import type { AnyLiveFiber } from '@/Fiber/Fiber.js'
import * as FiberRef from '@/FiberRef/FiberRef.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import * as Stack from '@/Stack/index.js'

export interface FiberRefs extends Iterable<readonly [FiberRef.AnyFiberRef, any]> {
  readonly locals: Atomic<ImmutableMap<FiberRef.AnyFiberRef, Stack.Stack<any>>>
  readonly initializing: Atomic<ImmutableMap<FiberRef.AnyFiberRef, AnyLiveFiber>>
  readonly fork: () => FiberRefs
}

export function FiberRefs(
  locals: ImmutableMap<FiberRef.AnyFiberRef, Stack.Stack<any>> = ImmutableMap(),
  initializing: ImmutableMap<FiberRef.AnyFiberRef, AnyLiveFiber> = ImmutableMap(),
): FiberRefs {
  const atomic = Atomic(locals)
  const fiberRefs: FiberRefs = {
    locals: atomic,
    initializing: Atomic(initializing),
    fork: () => fork(fiberRefs),
    *[Symbol.iterator]() {
      for (const [key, stack] of atomic.get()) {
        yield [key, stack.value] as const
      }
    },
  }

  return fiberRefs
}

export function maybeGetFiberRefStack<R, E, A>(fiberRef: FiberRef.FiberRef<R, E, A>) {
  return (fiberRefs: FiberRefs) =>
    fiberRefs.locals.get().get(fiberRef) as Maybe.Maybe<Stack.Stack<A>>
}

export function maybeGetFiberRefValue<R, E, A>(fiberRef: FiberRef.FiberRef<R, E, A>) {
  return flow(
    maybeGetFiberRefStack(fiberRef),
    Maybe.map((s) => s.value),
  )
}

export function setFiberRef<R, E, A>(fiberRef: FiberRef.FiberRef<R, E, A>, value: A) {
  return (fiberRefs: FiberRefs): A =>
    fiberRefs.locals.modify((locals) => {
      const curr = maybeGetFiberRefStack(fiberRef)(fiberRefs)

      return [
        value,
        locals.set(
          fiberRef,
          pipe(
            curr,
            Maybe.match(
              () => new Stack.Stack(value),
              (c) => c.replace(() => value),
            ),
          ),
        ),
      ]
    })
}

export function setFiberRefLocally<R, E, A>(fiberRef: FiberRef.FiberRef<R, E, A>, value: A) {
  return (fiberRefs: FiberRefs): A =>
    fiberRefs.locals.modify((locals) => {
      const curr = maybeGetFiberRefStack(fiberRef)(fiberRefs)

      return [
        value,
        locals.set(
          fiberRef,
          pipe(
            curr,
            Maybe.match(
              () => new Stack.Stack(value),
              (c) => c.push(value),
            ),
          ),
        ),
      ]
    })
}

export function popLocalFiberRef<R, E, A>(fiberRef: FiberRef.FiberRef<R, E, A>) {
  return (fiberRefs: FiberRefs): Maybe.Maybe<A> =>
    fiberRefs.locals.modify((locals) => {
      const curr = maybeGetFiberRefStack(fiberRef)(fiberRefs)

      if (Maybe.isNothing(curr)) {
        return [Maybe.Nothing, locals.remove(fiberRef)]
      }

      const prev = curr.value.pop()

      return [
        pipe(
          curr,
          Maybe.map((c) => c.value),
        ),
        prev ? locals.set(fiberRef, prev) : locals.remove(fiberRef),
      ]
    })
}

export function deleteFiberRef<R, E, A>(fiberRef: FiberRef.FiberRef<R, E, A>) {
  return (fiberRefs: FiberRefs): Maybe.Maybe<Stack.Stack<A>> =>
    fiberRefs.locals.modify((locals) => {
      const curr = maybeGetFiberRefStack(fiberRef)(fiberRefs)

      return [curr, locals.remove(fiberRef)]
    })
}

export function fork(fiberRefs: FiberRefs): FiberRefs {
  const updated = new Map<FiberRef.AnyFiberRef, Stack.Stack<any>>()

  for (const [key, stack] of fiberRefs.locals.get()) {
    const forked = key.fork(stack.value)

    if (Maybe.isJust(forked)) {
      updated.set(
        key,
        stack.replace(() => forked.value),
      )
    }
  }

  return FiberRefs(ImmutableMap(updated), fiberRefs.initializing.get())
}

export function join(first: FiberRefs, second: FiberRefs): void {
  const updated = new Map<FiberRef.AnyFiberRef, Stack.Stack<any>>(first.locals.get())
  const incoming = second.locals.get()

  for (const [key, stack] of incoming) {
    const current = updated.get(key)

    updated.set(key, current ? current.replace((a) => key.join(a, stack.value)) : stack)
  }

  first.locals.set(ImmutableMap(updated))
}
