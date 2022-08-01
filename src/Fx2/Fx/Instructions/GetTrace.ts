import * as Eff from '@/Eff/index.js'
import { Trace } from '@/Trace/Trace.js'

export class GetTrace extends Eff.GetTrace {
  readonly __R?: () => never
  readonly __E?: () => never
  readonly __A?: () => Trace
}
