import * as Eff from '@/Eff/index.js'

export class Failure<E> extends Eff.Failure<E> {
  readonly __R?: () => never
  readonly __E?: () => E
  readonly __A?: () => never
}
