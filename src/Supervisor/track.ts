import { Atomic } from '@/Atomic/Atomic'
import { FiberRuntime } from '@/FiberRuntime/FiberRuntime'
import { Strict } from 'hkt-ts/Typeclass/Eq'
import { fibersIn } from './fibersIn'
import { Supervisor } from './Supervisor'
import { withKeepAlive } from './withKeepAlive'

/**
 * Creates a simple Supervisor which keeps 
 */
export const track = (): Supervisor =>
  withKeepAlive(fibersIn(new Atomic<ReadonlySet<FiberRuntime<any, any, any>>>(new Set(), Strict)))
