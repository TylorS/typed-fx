import { HKT3, Params } from 'hkt-ts'

import { Stream } from './Stream'

export interface StreamHKT extends HKT3 {
  readonly type: Stream<this[Params.R], this[Params.E], this[Params.A]>
}
