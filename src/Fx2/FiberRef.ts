import { Maybe } from 'hkt-ts'
import { isRight } from 'hkt-ts/Either'
import { flow, pipe, second } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Fiber } from './Fiber.js'
import { FiberRefLocals } from './FiberRefLocals.js'
import { Pending, complete } from './Future.js'
import type { Fx } from './Fx.js'
import { Scope, scoped } from './Scope.js'
import { fromExit, fromLazy, lazy, now } from './constructors.js'
import { ensuring, flatMap, fork, map, wait } from './control-flow.js'
import { ask, getFiberRefs } from './intrinsics.js'

import { Tagged } from '@/Tagged/index.js'

export interface FiberRefs {
  readonly getAll: Fx.Of<ReadonlyMap<FiberRef<any, any, any>, any>>
  readonly get: <R, E, A>(ref: FiberRef<R, E, A>) => Fx<R, E, A>
  readonly modify: <R, E, A, R2, E2, B>(
    ref: FiberRef<R, E, A>,
    f: (a: A) => Fx<R2, E2, readonly [B, A]>,
  ) => Fx<R | R2, E | E2, B>
  readonly delete: <R, E, A>(ref: FiberRef<R, E, A>) => Fx.Of<Maybe.Maybe<A>>
  readonly fork: () => FiberRefs
  readonly inherit: (second: FiberRefs) => Fx.Of<void>
}

export interface FiberRef<R, E, A> {
  readonly id: FiberRefId
  readonly initial: Fx<R, E, A>
  readonly fork: (a: A) => Maybe.Maybe<A>
  readonly join: (a: A, b: A) => A
}

export type FiberRefId = Tagged<'FiberRefId', unknown>
export const FiberRefId = Tagged<FiberRefId>()

export namespace FiberRef {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  export type ResourcesOf<T> = T extends FiberRef<infer R, infer _E, infer _A> ? R : never
  export type ErrorsOf<T> = T extends FiberRef<infer _R, infer E, infer _A> ? E : never
  export type OutputOf<T> = T extends FiberRef<infer _R, infer _E, infer A> ? A : never
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export function FiberRef<R, E, A>(
  initial: Fx<R, E, A>,
  params?: Partial<Omit<FiberRef<R, E, A>, 'initial'>> & { readonly name?: string },
): FiberRef<R, E, A> {
  return {
    initial,
    id: params?.id ?? FiberRefId(Symbol(params?.name)),
    fork: params?.fork ?? Maybe.Just,
    join: params?.join ?? second,
  }
}

const one = NonNegativeInteger(1)

export function FiberRefs(locals: FiberRefLocals = FiberRefLocals()): FiberRefs {
  const getRef = (ref: FiberRef<any, any, any>) => locals.idsToValues.get().get(ref.id)
  const setRef = (ref: FiberRef<any, any, any>, value: any) => {
    locals.idsToRefs.set(locals.idsToRefs.get().set(ref.id, ref))
    locals.idsToValues.set(locals.idsToValues.get().set(ref.id, value))
  }
  const deleteRef = (ref: FiberRef<any, any, any>) => {
    locals.idsToRefs.set(locals.idsToRefs.get().remove(ref.id))
    locals.idsToValues.set(locals.idsToValues.get().remove(ref.id))
  }

  const semaphoreMap = new Map<FiberRefId, Semaphore<any, any, any>>()
  const getSemaphore = <R, E, A>(ref: FiberRef<R, E, A>) => {
    if (!semaphoreMap.has(ref.id)) {
      semaphoreMap.set(ref.id, Semaphore(ref, one))
    }

    return semaphoreMap.get(ref.id) as Semaphore<R, E, A>
  }

  const initializing = new Map<FiberRef<any, any, any>, Fiber<any, any>>()

  const modify = <R, E, A, R2, E2, B>(
    ref: FiberRef<R, E, A>,
    f: (a: A) => Fx<R2, E2, readonly [B, A]>,
  ) =>
    pipe(
      getSemaphore(ref).acquirePermits(one),
      flatMap(f),
      flatMap(([b, a]) =>
        pipe(
          fromLazy(() => {
            setRef(ref, a)
            return b
          }),
        ),
      ),
      scoped,
    )

  const initialRef = <R, E, A>(ref: FiberRef<R, E, A>) =>
    pipe(
      ref.initial,
      fork,
      flatMap((fiber) =>
        lazy(() => {
          initializing.set(ref, fiber)

          return fiber.join
        }),
      ),
      ensuring((exit) =>
        fromLazy(() => {
          initializing.delete(ref)
          if (isRight(exit)) {
            setRef(ref, exit.right)
          }
        }),
      ),
    )

  const get: FiberRefs['get'] = (ref) =>
    pipe(
      ref,
      getRef,
      Maybe.match(
        () =>
          initializing.has(ref)
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              pipe(initializing.get(ref)!.exit, flatMap(fromExit))
            : initialRef(ref),
        now,
      ),
    )

  const refs: FiberRefs = {
    getAll: fromLazy(locals.getAll),
    get,
    modify,
    delete: (ref) =>
      pipe(
        fromLazy(() => getRef(ref)),
        flatMap((current) =>
          lazy(() => {
            deleteRef(ref)

            return now(current)
          }),
        ),
      ),
    fork: () => {
      const updated = new Map()

      for (const [ref, value] of locals.getAll()) {
        const forked = ref.fork(value)

        if (Maybe.isJust(forked)) {
          updated.set(ref, forked.value)
        }
      }

      return FiberRefs(FiberRefLocals(updated))
    },
    inherit: (second) =>
      pipe(
        second.getAll,
        flatMap((s) =>
          fromLazy(() => {
            for (const [ref, value] of s) {
              const currentValue = getRef(ref)

              if (Maybe.isJust(currentValue)) {
                setRef(ref, ref.join(currentValue.value, value))
              } else {
                setRef(ref, value)
              }
            }
          }),
        ),
      ),
  }

  return refs
}

/**
 * A Semaphore is a concurrency primitive that allows a certain number accessors to
 * a resource. If the number of accessors exceeds the maximum number of permits,
 * then the accessors will be suspended until the permits are released.
 */
export interface Semaphore<R, E, A> {
  readonly maxPermits: NonNegativeInteger
  readonly availablePermits: Fx.Of<NonNegativeInteger>
  readonly acquiredPermits: Fx.Of<NonNegativeInteger>
  readonly acquirePermits: (n: NonNegativeInteger) => Fx.Scoped<R, E, A>
  readonly refresh: Fx.Of<Maybe.Maybe<A>>
}

export function Semaphore<R, E, A>(
  get: FiberRef<R, E, A>,
  maxPermits: NonNegativeInteger,
): Semaphore<R, E, A> {
  let acquired: NonNegativeInteger = NonNegativeInteger(0)
  const waiting: Array<[NonNegativeInteger, () => void]> = []
  const availablePermits = () => NonNegativeInteger(maxPermits - acquired)
  const releasePermits = (n: NonNegativeInteger) => {
    acquired = NonNegativeInteger(Math.max(0, acquired - n))

    let deleted = 0
    for (let i = 0; i < waiting.length && acquired < maxPermits; ++i) {
      const [required, start] = waiting[i - deleted]

      if (required <= availablePermits()) {
        waiting.splice(i - deleted, 1)
        deleted++
        start()
      }
    }
  }

  const acquireResource = (requestedPermits: NonNegativeInteger) =>
    pipe(
      getFiberRefs,
      flatMap((fiberRefs) => fiberRefs.get(get)),
      flatMap((a) =>
        pipe(
          ask(Scope),
          flatMap((scope) =>
            scope.ensuring(() => fromLazy(() => releasePermits(requestedPermits))),
          ),
          map(() => a),
        ),
      ),
    )

  return {
    maxPermits,
    availablePermits: fromLazy(availablePermits),
    acquiredPermits: fromLazy(() => acquired),
    acquirePermits: (n) =>
      lazy(() => {
        // Cannot request more than the max permits
        const requestedPermits = NonNegativeInteger(Math.min(n, maxPermits))

        // Immediately acquire resource
        if (requestedPermits <= availablePermits()) {
          acquired = NonNegativeInteger(requestedPermits + acquired)

          return acquireResource(requestedPermits)
        }

        const future = Pending<R | Scope, E, A>()
        const start = () => {
          acquired = NonNegativeInteger(requestedPermits + acquired)

          complete(future)(acquireResource(requestedPermits))
        }

        waiting.push([requestedPermits, start])

        return wait(future)
      }),
    refresh: pipe(
      getFiberRefs,
      flatMap((fiberRefs) => fiberRefs.delete(get)),
    ),
  }
}

export function get<R, E, A>(ref: FiberRef<R, E, A>): Fx<R, E, A> {
  return pipe(
    getFiberRefs,
    flatMap((fiberRefs) => fiberRefs.get(ref)),
  )
}

export function modify<A, R2, E2, B>(
  f: (a: A) => Fx<R2, E2, readonly [B, A]>,
): <R, E>(ref: FiberRef<R, E, A>) => Fx<R | R2, E | E2, B> {
  return (ref) =>
    pipe(
      getFiberRefs,
      flatMap((fiberRefs) => fiberRefs.modify(ref, f)),
    )
}

export function set<A>(value: A) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return modify((_: A) => now([value, value]))
}

export function getAndSet<A>(value: A) {
  return modify((_: A) => now([_, value]))
}

export function update<A, R2, E2>(f: (a: A) => Fx<R2, E2, A>) {
  return modify(
    flow(
      f,
      map((a) => [a, a]),
    ),
  )
}

export function getAndUpdate<A, R2, E2>(f: (a: A) => Fx<R2, E2, A>) {
  return modify((_: A) =>
    pipe(
      _,
      f,
      map((a) => [_, a]),
    ),
  )
}

export function remove<R, E, A>(ref: FiberRef<R, E, A>): Fx<R, E, Maybe.Maybe<A>> {
  return pipe(
    getFiberRefs,
    flatMap((fiberRefs) => fiberRefs.delete(ref)),
  )
}

export { remove as delete }

export function setFiberRefLocally<R2, E2, B>(ref: FiberRef<R2, E2, B>, value: B) {
  return <R, E, A>(fx: Fx<R, E, A>) =>
    pipe(
      ref,
      getAndSet(value),
      flatMap((current: B) =>
        pipe(
          fx,
          ensuring(() => set(current)(ref)),
        ),
      ),
    )
}

export const forkRefs = pipe(
  getFiberRefs,
  map((refs) => refs.fork()),
)

export const inheritRefs = (second: FiberRefs) =>
  pipe(
    getFiberRefs,
    flatMap((refs) => refs.inherit(second)),
  )

export const makeSemaphore =
  (maxPermits: NonNegativeInteger) =>
  <R, E, A>(ref: FiberRef<R, E, A>): Fx.Of<Semaphore<R, E, A>> =>
    fromLazy(() => Semaphore(ref, maxPermits))
