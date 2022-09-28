import { Maybe, flow, pipe } from 'hkt-ts'

import { Fx } from './Fx.js'
import { fromLazy, lazy, now } from './constructors.js'
import { flatMap, map } from './control-flow.js'
import { getEnv, getScope, provideEnv, provideService } from './intrinsics.js'

import * as Exit from '@/Exit/index.js'
import { Service } from '@/Service/Service.js'

export interface Scope {
  readonly get: Fx.Of<Maybe.Maybe<Exit.Exit<any, any>>>
  readonly ensuring: <R>(f: Finalizer<R, any, any>) => Fx.RIO<R, Finalizer<never, any, any>>
  readonly fork: Fx.Of<Scope>
}

export const Scope: Service<Scope> = Service<Scope>('Scope')

export interface Closeable extends Scope {
  readonly close: (exit: Exit.Exit<any, any>) => Fx.Of<boolean>
}

export interface Finalizer<R, E, A> {
  (exit: Exit.Exit<E, A>): Fx<R, never, any>
}

export class LocalScope implements Closeable {
  protected _value: Maybe.Maybe<Exit.Exit<any, any>> = Maybe.Nothing
  protected _refCount = 1
  protected _finalizers: Array<Finalizer<never, any, any>> = []

  readonly get: Closeable['get'] = fromLazy(() => this._value)

  readonly ensuring: Closeable['ensuring'] = <R>(f: Finalizer<R, any, any>) =>
    pipe(
      getEnv<R>(),
      flatMap((r) =>
        fromLazy(() => {
          const finalizer = flow(f, provideEnv(r))
          this._finalizers.push(finalizer)

          return (exit) =>
            lazy(() => {
              this._finalizers.splice(this._finalizers.indexOf(finalizer), 1)

              return finalizer(exit)
            })
        }),
      ),
    )

  readonly fork: Closeable['fork'] = pipe(
    fromLazy(() => new LocalScope()),
    flatMap((scope) =>
      pipe(
        fromLazy(() => this._refCount++),
        flatMap(() => scope.ensuring(() => this.release)),
        flatMap((finalizer) => this.ensuring(finalizer)),
        flatMap((finalizer) => scope.ensuring(finalizer)),
        map(() => scope),
      ),
    ),
  )

  readonly close: Closeable['close'] = (a) =>
    lazy(() => {
      // TODO: Should we be able to merge these values if they exist?
      if (Maybe.isNothing(this._value)) {
        this._value = Maybe.Just(a)
      }

      return this.release
    })

  protected release: Fx.Of<boolean> = lazy(() => {
    if (--this._refCount > 0 || Maybe.isNothing(this._value)) {
      return now(false)
    }

    if (this._finalizers.length === 0) {
      return now(true)
    }

    const exit = this._value.value

    const fx = pipe(
      this._finalizers.reduce(
        (fx, f) =>
          pipe(
            fx,
            flatMap(() => f(exit)),
          ),
        now(null),
      ),
      map(() => true),
    )

    this._finalizers = []

    return fx
  })
}

export const GlobalScope: Closeable = {
  get: now(Maybe.Nothing),
  ensuring: () => now(() => now(null)),
  fork: fromLazy(() => new LocalScope()),
  close: () => now(false),
}

export function scoped<R, E, A>(fx: Fx<R | Scope, E, A>): Fx<Exclude<R, Scope>, E, A> {
  return pipe(
    getScope,
    flatMap((scope) => scope.fork),
    flatMap((forked) => pipe(fx, provideService(Scope, forked))),
  )
}
