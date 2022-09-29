import { Maybe, flow, pipe } from 'hkt-ts'
import { First } from 'hkt-ts/Typeclass/Associative'

import { Fx } from './Fx.js'
import { fromLazy, lazy, now, unit } from './constructors.js'
import { attempt, flatMap, map } from './control-flow.js'
import { gen } from './gen.js'
import { getEnv, getScope, provideEnv, provideService } from './intrinsics.js'

import * as Exit from '@/Exit/index.js'
import { makeSequentialAssociative } from '@/Exit/index.js'
import { Service } from '@/Service/Service.js'

const concatExitSeq = makeSequentialAssociative<any, any>(First).concat

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
  protected _closed = false

  readonly get: Closeable['get'] = fromLazy(() => this._value)

  readonly ensuring: Closeable['ensuring'] = <R>(f: Finalizer<R, any, any>) =>
    this._closed && Maybe.isJust(this._value)
      ? pipe(
          f(this._value.value),
          map(() => () => unit),
        )
      : pipe(
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
        map(() => scope),
      ),
    ),
  )

  readonly close: Closeable['close'] = (a) =>
    lazy(() => {
      if (Maybe.isNothing(this._value)) {
        this._value = Maybe.Just(a)
      } else {
        this._value = Maybe.Just(concatExitSeq(this._value.value, a))
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

    const finalizers = this._finalizers
    const exit = this._value.value
    const finalize = gen(function* () {
      let finalExit = exit

      while (finalizers.length > 0) {
        finalExit = yield pipe(
          finalExit,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          finalizers.shift()!,
          attempt,
          map((e2: Exit.Exit<any, any>) => concatExitSeq(finalExit, e2)),
        )
      }

      return finalExit
    })

    return pipe(
      finalize,
      map(() => (this._closed = true)),
    )
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
