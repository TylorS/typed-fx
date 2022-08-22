import { flow, pipe } from 'hkt-ts'
import * as Maybe from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import * as FiberRef from './FiberRef.js'

import { Atomic } from '@/Atomic/Atomic.js'
import { Env } from '@/Env/index.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import * as Stack from '@/Stack/index.js'
import { EmptyTrace, Trace } from '@/Trace/Trace.js'

export interface FiberRefs {
  readonly locals: Atomic<ImmutableMap<FiberRef.AnyFiberRef, Stack.Stack<any>>>
  readonly fork: () => FiberRefs
}

const defaultFiberLocals = <R>(
  env: Env<R> = Env.empty,
  concurrencyLevel: NonNegativeInteger = NonNegativeInteger(Infinity),
  interruptStatus = true,
  trace: Trace = EmptyTrace,
) =>
  new Map<FiberRef.AnyFiberRef, Stack.Stack<any>>([
    [FiberRef.CurrentEnv, new Stack.Stack(env)],
    [FiberRef.CurrentConcurrencyLevel, new Stack.Stack(concurrencyLevel)],
    [FiberRef.CurrentInterruptStatus, new Stack.Stack(interruptStatus)],
    [FiberRef.CurrentTrace, new Stack.Stack(trace)],
  ])

export function FiberRefs(
  locals: ImmutableMap<FiberRef.AnyFiberRef, Stack.Stack<any>> = ImmutableMap(defaultFiberLocals()),
): FiberRefs {
  const atomic = Atomic(locals)

  return {
    locals: atomic,
    fork: () => FiberRefs(atomic.get()),
  }
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
