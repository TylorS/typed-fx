import type { Access } from '@/Eff/Access'
import type { Failure } from '@/Eff/Failure'

export type Instruction<R, E, A> = Access<R, R, E, A> | Failure<E>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ResourcesFromInstruction<T> = T extends Access<infer R, infer R2, infer _E, infer _A>
  ? R | R2
  : never

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ErrorsFromInstruction<T> = T extends Access<infer _R, infer _R2, infer _E, infer _A>
  ? _E
  : T extends Failure<infer E>
  ? E
  : never
