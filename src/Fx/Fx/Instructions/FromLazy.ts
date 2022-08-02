import * as Eff from '@/Eff/index.js'

export class FromLazy<A> extends Eff.FromLazy<A> {
  readonly __R?: () => never
  readonly __E?: () => never
  readonly __A?: () => A
}
