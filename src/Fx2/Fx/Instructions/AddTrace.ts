import * as Eff from '@/Eff/index.js'
import { Trace } from '@/Trace/Trace.js'

export class AddTrace extends Eff.AddTrace {
  readonly __R?: () => never
  readonly __E?: () => never
  readonly __A?: () => Trace
}
