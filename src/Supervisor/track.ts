import { Supervisor } from './Supervisor'
import { fibersIn } from './fibersIn'
import { withKeepAlive } from './withKeepAlive'

import { Atomic } from '@/Atomic/Atomic'
import type { FiberRuntime } from '@/FiberRuntime/FiberRuntime'

/**
 * Creates a simple Supervisor which keeps
 */
export const track = (
  ref?: Atomic<ReadonlySet<FiberRuntime<any, any, any>>>,
): Supervisor<ReadonlySet<FiberRuntime<any, any, any>>> => withKeepAlive(fibersIn(ref))
