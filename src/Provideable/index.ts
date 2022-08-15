import type { Env } from '@/Env/Env.js'
import type { Fx, IO } from '@/Fx/Fx.js'

export const PROVIDEABLE = Symbol('PROVIDEABLE')
export type PROVIDEABLE = typeof PROVIDEABLE

export interface Provideable<R> {
  readonly [PROVIDEABLE]: () => Env<R>
  readonly provide: <E, A>(fx: Fx<R, E, A>) => IO<E, A>
}
