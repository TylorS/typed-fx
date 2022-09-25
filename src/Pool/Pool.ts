import { isRight } from 'hkt-ts/Either'
import { pipe } from 'hkt-ts/function'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Attempted } from './Attempted.js'

import * as Exit from '@/Exit/index.js'
import { FiberId } from '@/FiberId/FiberId.js'
import * as Fx from '@/Fx/index.js'
import * as Queue from '@/Queue/index.js'
import { Scope } from '@/Scope/Scope.js'

export interface PoolRange {
  readonly min: NonNegativeInteger
  readonly max: NonNegativeInteger
}

interface PoolState {
  size: number
  free: number
}

export interface Pool<E, A> {
  readonly excess: Fx.Of<NonNegativeInteger>
  readonly size: Fx.Of<NonNegativeInteger>
  readonly free: Fx.Of<NonNegativeInteger>
  readonly initialize: Fx.RIO<Scope, void>
  readonly acquire: Fx.Fx<Scope, E, A>
  readonly invalidate: (item: A) => Fx.Of<void>
  readonly shrink: Fx.Of<boolean>
  readonly isShutdown: Fx.Of<boolean>
  readonly shutdown: Fx.Of<void>
}

export function Pool<E, A>(
  create: Fx.Fx<Scope, E, A>,
  range: PoolRange,
  track: (exit: Exit.Exit<E, A>) => Fx.Of<void>,
): Pool<E, A> {
  let down = false
  let isShuttingDown = false
  const items = Queue.dropping<Attempted<E, A>>(range.max)
  const state: PoolState = {
    size: 0,
    free: 0,
  }
  const invalidated = new Set<A>()

  const allocate = Fx.Fx(function* () {
    const { acquire, release }: Fx.Reservation<never, E, A> = yield* Fx.reserve(create)
    const exit: Exit.Exit<E, A> = yield* acquire
    const attempted = new Attempted(exit, release(exit))
    yield* items.enqueue(attempted)
    yield* track(exit)

    // If a concurrent shutdown occurs, ensure we clean up this resource as well
    if (isShuttingDown) {
      yield* shutdown
    }

    return attempted
  })

  const acquireAttempted: Fx.RIO<Scope, Attempted<E, A>> = Fx.Fx(function* () {
    if (isShuttingDown) {
      return yield* Fx.interrupted(FiberId.None)
    }

    if (state.free > 0 || state.size >= range.max) {
      // Track acquired resource
      state.free--

      const attempted = yield* items.dequeue

      // Allocate a new resource if the current has been invalidated
      if (isRight(attempted.exit) && invalidated.has(attempted.exit.right)) {
        state.free++

        yield* allocate

        return yield* acquireAttempted
      }

      return attempted
    }

    if (state.size >= 0) {
      state.size++
      state.free++

      yield* allocate

      return yield* acquireAttempted
    }

    return yield* Fx.interrupted(FiberId.None)
  })

  const deallocate = Fx.Fx(function* () {
    const attempted = yield* items.dequeue
    yield* attempted.with((a) => Fx.fromLazy(() => invalidated.delete(a)))
    yield* attempted.release
  })

  const release = (attempted: Attempted<E, A>) =>
    Fx.Fx(function* () {
      if (attempted.failed) {
        if (state.size <= range.min) {
          state.free++

          yield* allocate
        } else {
          state.size--
        }

        return
      }

      state.free++

      // Add back into the pool for use
      yield* items.enqueue(attempted)
      yield* track(attempted.exit)

      if (isShuttingDown) {
        yield* shutdown
      }
    })

  const excess = Fx.fromLazy(() => NonNegativeInteger(state.size - Math.min(range.min, state.free)))
  const size = Fx.fromLazy(() => NonNegativeInteger(state.size))
  const free = Fx.fromLazy(() => NonNegativeInteger(state.free))
  const isShutdown = Fx.fromLazy(() => down)

  const initialize: Fx.RIO<Scope, void> = Fx.Fx(function* () {
    while (state.size < range.min) {
      yield* allocate

      state.size++
      state.free++
    }
  })

  const invalidate = (a: A) =>
    Fx.fromLazy(() => {
      invalidated.add(a)
    })

  const acquire: Fx.Fx<Scope, E, A> = pipe(
    Fx.managed(acquireAttempted, release),
    Fx.flatMap((attempted) => Fx.fromExit(attempted.exit)),
  )

  const shrink: Fx.Of<boolean> = Fx.Fx(function* () {
    const canShrink = state.size > range.min
    const shouldShrink = state.free > 0

    if (canShrink && shouldShrink) {
      state.free--
      yield* deallocate
      state.size--

      return true
    }

    return false
  })

  const shutdown: Fx.Of<void> = Fx.Fx(function* () {
    if (down) {
      return
    }

    isShuttingDown = true

    if (state.free > 0) {
      yield* deallocate
      state.free--

      // Recursively call shutdown to cleanup all free resources
      yield* shutdown
    }

    // If there's still capacity bail out
    if (state.size > 0) {
      return
    }

    if (!(yield* items.isShutdown)) {
      yield* items.shutdown
      down = true
    }
  })

  const pool: Pool<E, A> = {
    excess,
    size,
    free,
    initialize,
    acquire,
    invalidate,
    shrink,
    isShutdown,
    shutdown,
  }

  return pool
}
