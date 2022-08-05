import { pipe } from 'hkt-ts'
import { isLeft } from 'hkt-ts/Either'

import * as Fiber from '../Fiber/index.js'
import {
  Fx,
  Of,
  attempt,
  fork,
  fromExit,
  getEnv,
  getFiberScope,
  join,
  lazy,
  provide,
  success,
} from '../Fx/Fx.js'
import type { Layer } from '../Layer/Layer.js'
import { Scope } from '../Scope/Scope.js'

import { never } from '@/Eff/Instructions/Async.js'
import { Exit } from '@/Exit/Exit.js'
import * as Service from '@/Service/index.js'

export interface Env<in R> {
  readonly get: <S extends R>(service: Service.Service<S>) => Of<S>
  readonly add: <S, I extends S>(service: Service.Service<S>, impl: I) => Env<R | S>
  readonly addLayer: <R2, E2, B>(layer: Layer<R2, E2, B>) => Fx<R2, E2, Env<R | B>>
}

export function Env<A, I extends A>(service: Service.Service<A>, implementation: I): Env<A> {
  return new Environment<A>(new Map<any, any>([[service, implementation]]), new Map(), new Map())
}

export class Environment<R> implements Env<R> {
  constructor(
    readonly services: Map<Service.Service<any>, R> = new Map(),
    readonly layers: Map<Service.Service<any>, Of<R>> = new Map(),
    readonly fibers: Map<Service.Service<any>, Fiber.Live<never, R>> = new Map(),
  ) {}

  readonly get = <S extends R>(s: Service.Service<S>): Of<S> =>
    lazy(() => {
      if (this.services.has(s)) {
        return success(this.services.get(s) as S)
      }

      if (this.fibers.has(s)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const fiber = this.fibers.get(s)!

        return Fx(function* () {
          return yield* fromExit<never, S>((yield* fiber.exit) as Exit<never, S>)
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

  readonly addLayer: <R2, E, S>(layer: Layer<R2, E, S>) => Fx<R2, E, Env<R | S>> = <R2, E, S>(
    layer: Layer<R2, E, S>,
  ): Fx<R2, E, Env<R | S>> => {
    const { services, layers, fibers } = this

    return Fx(function* () {
      const scope = yield* getFiberScope
      const env = yield* getEnv<R2>()
      const withScope = env.add(Scope, scope.fork())
      const provider = Fx(function* () {
        const exit = yield* pipe(layer.provider, provide(withScope), attempt)

        if (isLeft(exit)) {
          // Place the exit onto the Outer Scope in which the Layer was provided
          yield* scope.close(exit)

          // This Fx Should never return
          return yield* never
        } else {
          return exit.right
        }
      })

      return new Environment<
        R | S
      >(services, new Map<any, any>([...layers, [layer.service, provider]]), fibers)
    })
  }

  protected getLayer = <S extends R>(s: Service.Service<S>): Of<S> =>
    lazy(() => {
      const { services, layers, fibers } = this

      return Fx(function* () {
        const build = layers.get(s) as Of<S>
        const fiber: Fiber.Live<never, S> = yield* fork(build)
        fibers.set(s, fiber)

        const a: S = yield* join(fiber)

        services.set(s, a)
        fibers.delete(s)

        return a
      })
    })
}
