import { Cause } from '@/Cause/index.js'
import { FiberId } from '@/FiberId/FiberId.js'
import { Of } from '@/Fx/Fx.js'

// TODO: LogSpan
// TODO: LogAnnotations
// TODO: Console as a Logger
// TODO: Build into Fx runtime

export interface Logger<A, B> {
  readonly log: <E>(input: A, id: FiberId.Live, cause: Cause<E>) => Of<B>
}
