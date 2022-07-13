import { Strict } from 'hkt-ts/Typeclass/Eq'

import { Supervisor } from './Supervisor'
import { fibersIn } from './fibersIn'
import { withKeepAlive } from './withKeepAlive'

import { Atomic } from '@/Atomic/Atomic'
import type { FiberRuntime } from '@/FiberRuntime/FiberRuntime'

/**
 * Creates a simple Supervisor which keeps
 */
export const track = (): Supervisor =>
  withKeepAlive(fibersIn(new Atomic<ReadonlySet<FiberRuntime<any, any, any>>>(new Set(), Strict)))
