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

// Shared MUTABLE state
interface PoolState<E, A> {
  range: PoolRange
  isShutdown: boolean
  isShuttingDown: boolean
  size: number
  free: number
  items: Queue.Queue.Of<Attempted<E, A>>
  invalidated: Set<A>
}

export function Pool<E, A>(
  create: Fx.Fx<Scope, E, A>,
  range: PoolRange,
  track: (exit: Exit.Exit<E, A>) => Fx.Of<void>,
): Pool<E, A> {
  const state: PoolState<E, A> = {
    range,
    isShutdown: false,
    isShuttingDown: false,
    size: 0,
    free: 0,
    items: Queue.dropping<Attempted<E, A>>(range.max),
    invalidated: new Set<A>(),
  }

  const allocate = allocateResource(create, track, state)
  const managed = Fx.managed(acquireResource(state, allocate), release(state, track, allocate))

  const pool: Pool<E, A> = {
    excess: excess(state),
    size: size(state),
    free: free(state),
    isShutdown: isShutdown(state),
    invalidate: invalidate(state),
    initialize: initialize(state, allocate),
    acquire: acquire(state, managed),
    shrink: shrink(state),
    shutdown: shutdown(state),
  }

  return pool
}

const excess = <E, A>(state: PoolState<E, A>) =>
  Fx.fromLazy(() => NonNegativeInteger(state.size - Math.min(state.range.min, state.free)))

const size = <E, A>(state: PoolState<E, A>) => Fx.fromLazy(() => NonNegativeInteger(state.size))

const free = <E, A>(state: PoolState<E, A>) => Fx.fromLazy(() => NonNegativeInteger(state.free))

const isShutdown = <E, A>(state: PoolState<E, A>) => Fx.fromLazy(() => state.isShutdown)

const invalidate =
  <E, A>(state: PoolState<E, A>) =>
  (a: A) =>
    Fx.fromLazy(() => {
      state.invalidated.add(a)
    })

const initialize = <E, A>(
  state: PoolState<E, A>,
  allocate: Fx.Of<Attempted<E, A>>,
): Fx.RIO<Scope, void> =>
  Fx.Fx(function* () {
    while (state.size < state.range.min) {
      yield* allocate

      state.size++
      state.free++
    }
  })

const shutdown = <E, A>(state: PoolState<E, A>): Pool<E, A>['shutdown'] =>
  Fx.Fx(function* () {
    if (state.isShutdown) {
      return
    }

    state.isShuttingDown = true

    if (state.free > 0) {
      yield* deallocateResource(state)
      state.free--

      // Recursively call shutdown to cleanup all free resources
      yield* shutdown(state)
    }

    // If there's still capacity bail out
    if (state.size > 0) {
      return
    }

    if (!(yield* state.items.isShutdown)) {
      yield* state.items.shutdown
      state.isShutdown = true
    }
  })

const interruptIfShutdown = <E, A>(state: PoolState<E, A>) =>
  Fx.lazy(() => (state.isShuttingDown ? Fx.interrupted(FiberId.None) : Fx.unit))

const acquire = <E, A>(
  state: PoolState<E, A>,
  managed: Fx.Fx<Scope, never, Attempted<E, A>>,
): Fx.Fx<Scope, E, A> =>
  pipe(
    interruptIfShutdown(state),
    Fx.flatMap(() => managed),
    Fx.flatMap((attempted) => Fx.fromExit(attempted.exit)),
  )

const deallocateResource = <E, A>(state: PoolState<E, A>) =>
  pipe(
    state.items.dequeue,
    Fx.tap((attempted) => attempted.with((a) => Fx.fromLazy(() => state.invalidated.delete(a)))),
    Fx.tap((attempted) => attempted.release),
  )

const release =
  <E, A>(
    state: PoolState<E, A>,
    track: (exit: Exit.Exit<E, A>) => Fx.Of<void>,
    allocate: Fx.Of<Attempted<E, A>>,
  ) =>
  (attempted: Attempted<E, A>) =>
    Fx.Fx(function* () {
      if (attempted.failed) {
        if (state.size <= state.range.min) {
          state.free++

          yield* allocate
        } else {
          state.size--
        }

        return
      }

      state.free++

      // Add back into the pool for use
      yield* state.items.enqueue(attempted)
      yield* track(attempted.exit)

      if (state.isShuttingDown) {
        yield* shutdown(state)
      }
    })

function acquireResource<E, A>(
  state: PoolState<E, A>,
  allocate: Fx.Of<Attempted<E, A>>,
): Fx.Fx<Scope, never, Attempted<E, A>> {
  const canAllocateExistingResource = () => state.free > 0 || state.size >= state.range.max
  const shouldAllocateResource = () => state.size >= 0

  return pipe(
    interruptIfShutdown(state),
    Fx.flatMap(() =>
      canAllocateExistingResource()
        ? acquireExistingResource(state, allocate)
        : shouldAllocateResource()
        ? allocateAndAquire(state, allocate)
        : Fx.interrupted(FiberId.None),
    ),
  )
}

const acquireExistingResource = <E, A>(state: PoolState<E, A>, allocate: Fx.Of<Attempted<E, A>>) =>
  Fx.lazy(() => {
    // Track acquired resource
    state.free--

    const hasBeenInvalidated = (attempted: Attempted<E, A>) =>
      isRight(attempted.exit) && state.invalidated.has(attempted.exit.right)

    return pipe(
      state.items.dequeue,
      Fx.flatMap((attempted) =>
        hasBeenInvalidated(attempted)
          ? reacquireInvalidatedResource(state, allocate)
          : Fx.now(attempted),
      ),
    )
  })

const reacquireInvalidatedResource = <E, A>(
  state: PoolState<E, A>,
  allocate: Fx.Of<Attempted<E, A>>,
) =>
  Fx.lazy(() => {
    // Release the resource
    state.free++

    return pipe(
      allocate,
      Fx.flatMap(() => acquireResource(state, allocate)),
    )
  })

const allocateAndAquire = <E, A>(state: PoolState<E, A>, allocate: Fx.Of<Attempted<E, A>>) =>
  Fx.lazy(() => {
    state.size++
    state.free++

    return pipe(
      allocate,
      Fx.flatMap(() => acquireResource(state, allocate)),
    )
  })

function allocateResource<E, A>(
  create: Fx.Fx<Scope, E, A>,
  track: (exit: Exit.Exit<E, A>) => Fx.Of<void>,
  state: PoolState<E, A>,
) {
  return pipe(
    Fx.reserve(create),
    Fx.bindTo('reservation'),
    Fx.bind('exit', ({ reservation }) => reservation.acquire),
    Fx.let('attempted', ({ exit, reservation }) => new Attempted(exit, reservation.release(exit))),
    Fx.tap(({ attempted }) => state.items.enqueue(attempted)),
    Fx.tap(({ attempted }) => track(attempted.exit)),
    Fx.tap(() => (state.isShuttingDown ? shutdown(state) : Fx.unit)),
    Fx.map(({ attempted }) => attempted),
  )
}

const shrink = <E, A>(state: PoolState<E, A>) =>
  Fx.Fx(function* () {
    const canShrink = state.size > state.range.min
    const shouldShrink = state.free > 0

    if (canShrink && shouldShrink) {
      state.free--
      yield* deallocateResource(state)
      state.size--

      return true
    }

    return false
  })
