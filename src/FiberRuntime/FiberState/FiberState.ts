import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'

import type { Atomic } from '@/Atomic/Atomic.js'
import { Disposable } from '@/Disposable/Disposable.js'
import type { Exit } from '@/Exit/Exit.js'
import type { AnyFiber } from '@/Fiber/Fiber.js'
import type { FiberId } from '@/FiberId/FiberId.js'
import { Done, FiberStatus, Running, Suspended } from '@/FiberStatus/index.js'
import type { AnyInstruction } from '@/Fx/Instruction.js'
import { AnyFx, Fx, zipAll } from '@/Fx/index.js'

export interface FiberState<E, A> {
  readonly started: boolean
  readonly status: FiberStatus
  readonly instruction: Maybe<AnyInstruction>
  readonly observers: ReadonlyArray<(exit: Exit<E, A>) => void>
  readonly children: ReadonlySet<AnyFiber>
  readonly interruptedBy: ReadonlySet<FiberId>
}

export function start<E, A>(state: Atomic<FiberState<E, A>>): boolean {
  return state.modify((s) => [!s.started, { ...s, started: true }])
}

export function running<E, A>(state: Atomic<FiberState<E, A>>): boolean {
  return state.modify((s) => [s.status.tag === 'Suspended', { ...s, status: Running }])
}

export function suspended<E, A>(state: Atomic<FiberState<E, A>>): boolean {
  return state.modify((s) => [s.status.tag === 'Running', { ...s, status: Suspended }])
}

export function done<E, A>(exit: Exit<E, A>) {
  return (state: Atomic<FiberState<E, A>>): boolean => {
    return state.modify((s) =>
      s.status.tag === 'Done' ? [false, s] : [true, { ...s, status: Done(exit) }],
    )
  }
}

export function setInstruction(fx: AnyFx) {
  return <E, A>(state: Atomic<FiberState<E, A>>): void =>
    state.modify((s) => [void 0, { ...s, instruction: Just(fx.instr) }])
}

export function clearInstruction<E, A>(state: Atomic<FiberState<E, A>>): void {
  return state.modify((s) => [void 0, { ...s, instruction: Nothing }])
}

export function addObserver<E, A>(f: (exit: Exit<E, A>) => void) {
  return (state: Atomic<FiberState<E, A>>): Disposable =>
    state.modify((s) => [
      Disposable(() => removeObserver(state, f)),
      { ...s, observers: [...s.observers, f] },
    ])
}

function removeObserver<E, A>(
  state: Atomic<FiberState<E, A>>,
  f: (exit: Exit<E, A>) => void,
): void {
  return state.modify((s) => [void 0, { ...s, observers: s.observers.filter((x) => x !== f) }])
}

export function addChild(child: AnyFiber) {
  return <E, A>(state: Atomic<FiberState<E, A>>): Disposable =>
    state.modify((s) => [
      Disposable(() => removeChild(state, child)),
      { ...s, children: new Set([...s.children, child]) },
    ])
}

function removeChild<E, A>(state: Atomic<FiberState<E, A>>, child: AnyFiber): void {
  return state.modify((s) => [
    void 0,
    { ...s, children: new Set(Array.from(s.children).filter((x) => x !== child)) },
  ])
}

export function interruptChildren(id: FiberId) {
  return <E, A>(state: Atomic<FiberState<E, A>>): Fx<never, never, readonly Exit<any, any>[]> => {
    return state.modify((s) => [
      zipAll(Array.from(s.children).map((s) => s.interruptAs(id))),
      { ...s, children: new Set() },
    ])
  }
}
