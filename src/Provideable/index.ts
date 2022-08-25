// eslint-disable-next-line import/no-cycle
import * as Env from '@/Env/Env.js'

export const PROVIDEABLE = Symbol('PROVIDEABLE')
export type PROVIDEABLE = typeof PROVIDEABLE

/**
 * Provideable is an interface Services can implement to help you create an Env or provide it to an Fx.
 * Generally meant to be used to help create synchronous Envs. Service.Id implements this interface and is
 * the easiest way to utilize this.
 *
 * @example
 * import * as S from '@typed/fx/Service'
 * import * as Fx from '@typed/fx/Fx'
 *
 * export class MyService extends S.Id {
 *   constructor(readonly foo: string) {}
 * }
 *
 * const program = Fx.Fx(function*() {
 *  const { foo } = yield* MyService.ask()
 *  ...
 * })
 *
 * // With Fx.provide
 * pipe( program, Fx.provide( new MyService('example') ), Fx.runMain ).catch(error => {
 *   console.error(error)
 * })
 *
 * // Built-in provide
 * Fx.runMain( new MyService('example').provide( program ) ).catch(error => {
 *   console.error(error)
 * })
 *
 *
 * // With other services
 * pipe( program, Fx.provide( new MyService('example').add( new MyOtherService() ) ), Fx.runMain ).catch(error => {
 *   console.error(error)
 * })
 */
export abstract class Provideable<R> {
  static readonly get = <R>(p: Provideable<R>): Env.Env<R> => p[PROVIDEABLE]()

  readonly name: string = this.constructor.name;

  abstract readonly [PROVIDEABLE]: () => Env.Env<R>

  readonly join = <S>(second: Provideable<S>): Env.Env<R | S> =>
    Env.concat(Provideable.get(second))(Provideable.get(this))
}
