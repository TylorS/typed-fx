import { pipe } from 'hkt-ts'
import * as Maybe from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'
import { Scope } from 'ts-morph'

import { Fiber } from '@/Fiber/Fiber.js'
import { FiberRef, FiberRefId } from '@/FiberRef/FiberRef.js'
import * as Fx from '@/Fx/Fx.js'
import { flatJoin } from '@/Fx/join.js'
import { scoped } from '@/Fx/scoped.js'
import { Lock, Semaphore } from '@/Semaphore/Semaphore.js'
import { Stack } from '@/Stack/index.js'

export interface FiberRefs {
  readonly locals: Locals

  readonly get: <R, E, A>(fiberRef: FiberRef<R, E, A>) => Fx.Fx<R, E, A>

  readonly modify: <R, E, A, R2, E2, B>(
    fiberRef: FiberRef<R, E, A>,
    f: (a: A) => Fx.Fx<R2, E2, readonly [B, A]>,
  ) => Fx.Fx<Exclude<R | R2, Scope>, E | E2, B>

  readonly delete: <R, E, A>(fiberRef: FiberRef<R, E, A>) => Fx.Fx<R, E, Maybe.Maybe<A>>

  readonly locally: <R, E, A, R2, E2, B>(
    fiberRef: FiberRef<R, E, A>,
    value: A,
    fx: Fx.Fx<R2, E2, B>,
  ) => Fx.Fx<R2, E2, B>

  readonly fork: () => FiberRefs

  readonly join: (fiberRefs: FiberRefs) => Fx.Fx.Of<void>
}

export function FiberRefs(
  locals: Locals = Locals(),
  initializing: Iterable<readonly [FiberRefId, Fiber<any, any>]> = new Map(),
): FiberRefs {
  const initializingFibers = new Map(initializing)
  const semaphores = new Map<FiberRefId, Semaphore<any, any, any>>()
  const getSemaphore = <R, E, A>(ref: FiberRef<R, E, A>) => {
    // TODO: How to handle when the current ref is being modified?
    if (semaphores.has(ref.id) && locals.isCurrentRef(ref)) {
      return semaphores.get(ref.id) as Semaphore<R, E, A>
    }

    const semaphore = Lock(ref.initial)

    semaphores.set(ref.id, semaphore)

    return semaphore
  }

  const get: FiberRefs['get'] = (ref) =>
    Fx.lazy(() => {
      const current = locals.get(ref)

      if (Maybe.isJust(current)) {
        return Fx.now(current.value)
      }

      if (initializingFibers.has(ref.id)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return pipe(initializingFibers.get(ref.id)!.exit, Fx.flatMap(Fx.fromExit))
      }

      return pipe(
        ref.initial,
        Fx.fork,
        Fx.tapLazy((fiber) => initializingFibers.set(ref.id, fiber)),
        flatJoin,
        Fx.tapLazy((a) => {
          locals.set(ref, a)
          initializingFibers.delete(ref.id)
        }),
      )
    })

  const modify: FiberRefs['modify'] = <R, E, A, R2, E2, B>(
    ref: FiberRef<R, E, A>,
    f: (a: A) => Fx.Fx<R2, E2, readonly [B, A]>,
  ): Fx.Fx<Exclude<R | R2, Scope>, E | E2, B> =>
    pipe(
      getSemaphore(ref).acquirePermits(NonNegativeInteger(1)),
      Fx.flatMap((a) => f(a)),
      Fx.tapLazy(([, a]) => locals.set(ref, a)),
      Fx.map(([b]) => b),
      scoped,
    ) as any

  const remove: FiberRefs['delete'] = (ref) => Fx.fromLazy(() => locals.delete(ref))

  const locally: FiberRefs['locally'] = <R, E, A, R2, E2, B>(
    fiberRef: FiberRef<R, E, A>,
    value: A,
    fx: Fx.Fx<R2, E2, B>,
  ) =>
    Fx.lazy(() => {
      locals.pushLocal(fiberRef, value)

      return pipe(
        fx,
        Fx.ensuring(() => Fx.fromLazy(() => locals.popLocal(fiberRef))),
      )
    })

  const refs: FiberRefs = {
    locals,
    get,
    modify,
    delete: remove,
    locally,
    fork: () => FiberRefs(locals.fork(), initializingFibers),
    join: (other) => Fx.fromLazy(() => locals.join(other.locals)),
  }

  return refs
}

export interface Locals {
  readonly getAll: () => ReadonlyMap<FiberRef<any, any, any>, Stack<any>>
  readonly isCurrentRef: <R, E, A>(fiberRef: FiberRef<R, E, A>) => boolean
  readonly getStack: <R, E, A>(fiberRef: FiberRef<R, E, A>) => Maybe.Maybe<Stack<A>>
  readonly get: <R, E, A>(fiberRef: FiberRef<R, E, A>) => Maybe.Maybe<A>
  readonly set: <R, E, A>(fiberRef: FiberRef<R, E, A>, value: A) => void
  readonly delete: <R, E, A>(fiberRef: FiberRef<R, E, A>) => Maybe.Maybe<A>
  readonly pushLocal: <R, E, A>(fiberRef: FiberRef<R, E, A>, value: A) => void
  readonly popLocal: <R, E, A>(fiberRef: FiberRef<R, E, A>) => void
  readonly fork: () => Locals
  readonly join: (locals: Locals) => void
}

export function Locals(
  initial: Iterable<readonly [FiberRef<any, any, any>, Stack<any>]> = new Map(),
): Locals {
  const idToFiberRef = new Map([...initial].map(([k]) => [k.id, k] as const))
  const idToValue = new Map([...initial].map(([k, v]) => [k.id, v]))

  const getAll = () => {
    const map = new Map<FiberRef<any, any, any>, Stack<any>>()

    for (const ref of idToFiberRef.values()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      map.set(ref, idToValue.get(ref.id)!)
    }

    return map
  }

  const getStack = <R, E, A>(ref: FiberRef<R, E, A>) =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    idToValue.has(ref.id) ? Maybe.Just(idToValue.get(ref.id)!) : Maybe.Nothing

  const get = <R, E, A>(ref: FiberRef<R, E, A>) =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    idToValue.has(ref.id) ? Maybe.Just(idToValue.get(ref.id)!.value) : Maybe.Nothing

  const set = <R, E, A>(ref: FiberRef<R, E, A>, value: A) => {
    idToFiberRef.set(ref.id, ref)
    idToValue.set(ref.id, idToValue.get(ref.id)?.replace(() => value) ?? new Stack(value))
  }

  const setStack = <R, E, A>(ref: FiberRef<R, E, A>, stack: Stack<A>) => {
    idToFiberRef.set(ref.id, ref)
    idToValue.set(ref.id, stack)
  }

  const remove: Locals['delete'] = (ref) => {
    const c = get(ref)

    idToValue.delete(ref.id)
    idToFiberRef.delete(ref.id)

    return c
  }

  const pushLocal = <R, E, A>(ref: FiberRef<R, E, A>, value: A) =>
    setStack(ref, idToValue.get(ref.id)?.push(value) ?? new Stack(value))

  const popLocal = <R, E, A>(ref: FiberRef<R, E, A>) => {
    const popped = idToValue.get(ref.id)?.pop()

    if (popped) {
      setStack(ref, popped)
    } else {
      remove(ref)
    }
  }

  return {
    getAll,
    isCurrentRef: (ref) => idToFiberRef.get(ref.id) === ref,
    getStack,
    get,
    set,
    delete: remove,
    pushLocal,
    popLocal,
    fork: () => {
      const forked = new Map()

      for (const [ref, stack] of getAll()) {
        const maybe = ref.fork(stack.value)

        if (Maybe.isJust(maybe)) {
          forked.set(ref, maybe.value)
        }
      }

      return Locals(forked)
    },
    join: (other) => {
      for (const [ref, stack] of other.getAll()) {
        const current = get(ref)

        set(ref, Maybe.isJust(current) ? ref.join(current.value, stack.value) : stack.value)
      }
    },
  }
}
