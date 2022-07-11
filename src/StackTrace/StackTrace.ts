import { FiberId } from '@/FiberId/FiberId'
import { Stack } from '@/Stack/index'
import { Trace } from '@/Trace/Trace'

export class StackTrace {
  constructor(readonly fiberId: FiberId, readonly trace: Stack<Trace>) {}
}
