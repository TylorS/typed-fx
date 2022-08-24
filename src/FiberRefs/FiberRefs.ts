import { flow, pipe } from 'hkt-ts'
import * as Maybe from 'hkt-ts/Maybe'
import { NonNegativeInteger } from 'hkt-ts/number'

import { Atomic } from '@/Atomic/Atomic.js'
import { Env } from '@/Env/index.js'
import * as FiberRef from '@/FiberRef/FiberRef.js'
import { ImmutableMap } from '@/ImmutableMap/ImmutableMap.js'
import { Semaphore } from '@/Semaphore/index.js'
import * as Stack from '@/Stack/index.js'
import { EmptyTrace, Trace } from '@/Trace/Trace.js'

export interface FiberRefs extends Iterable<readonly [FiberRef.AnyFiberRef, any]> {
  readonly locals: Atomic<ImmutableMap<FiberRef.AnyFiberRef, Stack.Stack<any>>>
  readonly fork: () => FiberRefs
}

const defaultFiberLocals = <R = never>(
  env: Env<R> = Env.empty as Env<R>,
  concurrencyLevel: NonNegativeInteger = NonNegativeInteger(Infinity),
  interruptStatus = true,
  trace: Trace = EmptyTrace,
) =>
  new Map<FiberRef.AnyFiberRef, Stack.Stack<any>>([
    [FiberRef.CurrentEnv, new Stack.Stack(env)],
    [FiberRef.CurrentConcurrencyLevel, new Stack.Stack(new Semaphore(concurrencyLevel))],
    [FiberRef.CurrentInterruptStatus, new Stack.Stack(interruptStatus)],
    [FiberRef.CurrentTrace, new Stack.Stack(trace)],
  ])

export function FiberRefs(
  locals: ImmutableMap<FiberRef.AnyFiberRef, Stack.Stack<any>> = ImmutableMap(defaultFiberLocals()),
): FiberRefs {
  const atomic = Atomic(locals)
  const fiberRefs: FiberRefs = {
    locals: atomic,
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

  return FiberRefs(ImmutableMap(updated))
}

export function join(first: FiberRefs, second: FiberRefs): void {
  const updated = new Map<FiberRef.AnyFiberRef, Stack.Stack<any>>(first.locals.get())

  for (const [key, stack] of second.locals.get()) {
    if (updated.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      updated.set(key, key.join(updated.get(key)!.value, stack.value))
    } else {
      updated.set(key, stack.value)
    }
  }

  first.locals.set(ImmutableMap(updated))
}
