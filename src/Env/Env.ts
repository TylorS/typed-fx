import { pipe } from 'hkt-ts'
import { isLeft } from 'hkt-ts/Either'

import type { Exit } from '@/Exit/Exit.js'
import type * as Fiber from '@/Fiber/index.js'
import * as Fx from '@/Fx/Fx.js'
import type { Layer } from '@/Layer/Layer.js'
import { PROVIDEABLE, Provideable } from '@/Provideable/index.js'
import { Scope } from '@/Scope/Scope.js'
import * as Service from '@/Service/Service.js'

export interface Env<in R> extends Provideable<R> {
  readonly get: <S extends R>(service: Service.Service<S>) => Fx.Of<S>
  readonly add: <S, I extends S>(service: Service.Service<S>, impl: I) => Env<R | S>
  readonly addLayer: <R2, E2, B>(layer: Layer<R2, E2, B>) => Fx.Fx<R2, E2, Env<R | B>>
}

export function Env<A, I extends A>(service: Service.Service<A>, implementation: I): Env<A> {
  return new Environment<A>(new Map<any, any>([[service, implementation]]), new Map(), new Map())
}

export class Environment<R> implements Env<R> {
  readonly [PROVIDEABLE]: Env<R>[PROVIDEABLE]
  readonly provide: Env<R>['provide']

  constructor(
    readonly services: Map<Service.Service<any>, R> = new Map(),
    readonly layers: Map<Service.Service<any>, Fx.Of<R>> = new Map(),
    readonly fibers: Map<Service.Service<any>, Fiber.Live<never, R>> = new Map(),
  ) {
    this[PROVIDEABLE] = () => this
    this.provide = (fx) => Fx.provide(this)(fx)
  }

  readonly get = <S extends R>(s: Service.Service<S>): Fx.Of<S> =>
    Fx.lazy(() => {
      if (this.services.has(s)) {
        return Fx.success(this.services.get(s) as S)
      }

      if (this.fibers.has(s)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const fiber = this.fibers.get(s)!

        return Fx.Fx(function* () {
          return yield* Fx.fromExit<never, S>((yield* fiber.exit) as Exit<never, S>)
        })
      }

      if (this.layers.has(s)) {
        return this.getLayer(s)
      }

      throw new Error(
        `Unable to find an implementation or Layer for Service: ${Service.formatService(s)}`,
      )
    })

  readonly add: Env<R>['add'] = (<S, I extends S>(
    service: Service.Service<S>,
    implementation: I,
  ): Env<R | S> =>
    new Environment<R | S>(
      new Map<any, any>([...this.services, [service, implementation as S]]),
      this.layers,
      this.fibers,
    )) as Env<R>['add'] // TODO: Why is this type-cast needed here?

  readonly addLayer: <R2, E, S>(layer: Layer<R2, E, S>) => Fx.Fx<R2, E, Env<R | S>> = <R2, E, S>(
    layer: Layer<R2, E, S>,
  ): Fx.Fx<R2, E, Env<R | S>> => {
    const { services, layers, fibers } = this

    return Fx.Fx(function* () {
      const scope = yield* Fx.getFiberScope
      const env = yield* Fx.getEnv<R2>()
      const provider = Fx.Fx(function* () {
        const exit = yield* pipe(layer.provider, Fx.provide(env.add(Scope, scope)), Fx.attempt)

        if (isLeft(exit)) {
          // Place the exit onto the Outer Scope in which the Layer was provided
          yield* scope.close(exit)

          // This Fx Should never return
          return yield* Fx.fromExit(exit)
        } else {
          return exit.right
        }
      })

      return new Environment<
        R | S
      >(services, new Map<any, any>([...layers, [layer.service, provider]]), fibers)
    })
  }

  protected getLayer = <S extends R>(s: Service.Service<S>): Fx.Of<S> =>
    Fx.lazy(() => {
      const { services, layers, fibers } = this

      return Fx.Fx(function* () {
        const build = layers.get(s) as Fx.Of<S>
        const fiber: Fiber.Live<never, S> = yield* Fx.fork(build)
        fibers.set(s, fiber)

        const a: S = yield* Fx.join(fiber)

        services.set(s, a)
        fibers.delete(s)

        return a
      })
    })
}

Env.empty = new Environment<never>() as Env<never>
