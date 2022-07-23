import type { Access } from './Env'
import type { Fail } from './Fail'

export type Instruction<R, E, A> = Access<R, R, E, A> | Fail<E>
