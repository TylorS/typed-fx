import { Effect } from '@/Effect/Effect.js'

export interface Fx<out R, out E, out A> {
  readonly effect: Effect<Instruction<R, E, any>, E, A>
  readonly [Symbol.iterator]: () => Generator<Instruction<R, E, any>, A, any>
}

// TODO: FiberRefs
// TODO: Services/Layers
// TODO: Scope
// TODO: Scheduler
// TODO: Logging
// TODO: Parent references

export type Instruction<R, E, A> = Ask<R> | WithConcurrency<R, E, A>

export class Ask<R> extends Effect.instr('Ask')<void, never, R> {}

export class WithConcurrency<R, E, A> extends Effect.instr('WithConcurrency')<
  [Fx<R, E, A>, number],
  E,
  A
> {}
