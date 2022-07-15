import { Strict } from 'hkt-ts/Typeclass/Eq'

import { Supervisor } from './Supervisor'

import { Atomic } from '@/Atomic/Atomic'

export const None = new Supervisor<any>(new Atomic<void>(undefined, Strict))
export type None = typeof None
