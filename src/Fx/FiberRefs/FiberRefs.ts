/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Just, Maybe, Nothing, isJust } from 'hkt-ts/Maybe'

import { getFiberRefs } from '../Fx/Instruction/GetFiberRefs.js'
import { zipAll } from '../Fx/Instruction/ZipAll.js'

import type { Fiber } from '@/Fx/Fiber/index.js'
import * as FiberRef from '@/Fx/FiberRef/index.js'
import * as Fx from '@/Fx/Fx/Fx.js'
import * as Fork from '@/Fx/Fx/Instruction/Fork.js'
import { Lock, Semaphore, acquire } from '@/Fx/Semaphore/Semaphore.js'

export interface FiberRefs {
  /**
   * Retrieve the current value of a FiberRef. Multiple Fibers can read as much as they would like.
   */
  readonly get: <R extends FiberRef.AnyFiberRef>(
    ref: R,
  ) => Fx.Fx<FiberRef.ResourcesOf<R>, FiberRef.ErrorsOf<R>, FiberRef.OutputOf<R>>

  /**
   * Uses a Semaphore to ensure that only 1 update can happen at once, asynchronously suspending fibers until it is their
   * turn to run their update.
   */
  readonly modify: <R extends FiberRef.AnyFiberRef, R2, E2, B>(
    ref: R,
    f: (a: FiberRef.OutputOf<R>) => Fx.Fx<R2, E2, readonly [B, FiberRef.OutputOf<R>]>,
  ) => Fx.Fx<FiberRef.ResourcesOf<R> | R2, FiberRef.ErrorsOf<R> | E2, B>

  /**
   * Create a new FiberRefs instance that forks each FiberRef it contains based on the user provided semantics.
   */
  readonly fork: Fx.Of<FiberRefs>

  /**
   * Join together 2 FiberRefs. If the FiberRef exists, its join functionality will be used to determine which value to keep.
   * If the FiberRef does not exist, it will upsert that provided value.
   */
  readonly join: <R extends FiberRef.AnyFiberRef>(
    ref: R,
    value: FiberRef.OutputOf<R>,
  ) => Fx.Of<void>

  /**
   * Inherit all FiberRefs into the current Fiber.
   */
  readonly inherit: Fx.Of<void>
}

/**
 * Constructs a new FiberRefs instance.
 */
export function FiberRefs(references: Map<FiberRef.AnyFiberRef, any>): FiberRefs {
  const fibers = new Map<FiberRef.AnyFiberRef, Fiber<any, any>>()
  const semaphores = new Map<FiberRef.AnyFiberRef, Semaphore>()

  const getMaybe = <R extends FiberRef.AnyFiberRef>(ref: R): Maybe<FiberRef.OutputOf<R>> =>
    references.has(ref) ? Just(references.get(ref)) : Nothing

  const get: FiberRefs['get'] = (ref) =>
    Fx.Fx(function* () {
      const current: Maybe<FiberRef.OutputOf<typeof ref>> = getMaybe(ref)

      // If it's already stored in-memory, go ahead and return it
      if (isJust(current)) {
        return current.value
      }

      // Initialize the FiberRef, accounting for concurrent access.
      return yield* initializeFiberRef(ref)
    })

  const modify: FiberRefs['modify'] = (ref, f) =>
    runWithSemaphore(
      ref,
      Fx.Fx(function* () {
        const [b, updated] = yield* f(yield* get(ref))

        references.set(ref, updated)

        return b
      }),
    )

  const fork = Fx.fromLazy(() => {
    const forked = new Map<FiberRef.AnyFiberRef, any>()

    for (const [k, v] of references) {
      const maybe = k.fork(v)

      if (isJust(maybe)) {
        forked.set(k, maybe.value)
      }
    }

    return FiberRefs(forked)
  })

  const join: FiberRefs['join'] = (ref, value) =>
    Fx.fromLazy(() => {
      const local = getMaybe(ref)

      references.set(ref, isJust(local) ? local.value.join(value) : value)
    })

  const inherit: FiberRefs['inherit'] = Fx.Fx(function* () {
    const refs = yield* getFiberRefs()

    yield* zipAll(Array.from(references).map(([k, v]) => refs.join(k, v)))
  })

  const fiberRefs: FiberRefs = {
    get,
    modify,
    fork,
    join,
    inherit,
  }

  return fiberRefs

  function runWithSemaphore<REF extends FiberRef.AnyFiberRef, R, E, A>(
    ref: REF,
    fx: Fx.Fx<R, E, A>,
  ): Fx.Fx<R, E, A> {
    const semaphore = semaphores.get(ref) ?? (semaphores.set(ref, new Lock()).get(ref) as Semaphore)

    return acquire(semaphore)(fx)
  }

  // Initialize the FiberRef's data
  function* initializeFiberRef<R, E, A>(ref: FiberRef.FiberRef<R, E, A>) {
    // Multiple accessors to this data
    if (fibers.has(ref)) {
      return yield* Fork.join(fibers.get(ref)!)
    }

    // Initial accessor to this data
    const fiber = yield* Fork.fork(ref.initial)

    fibers.set(ref, fiber)

    const value = yield* Fork.join(fiber)

    references.set(ref, value)

    return value
  }
}
