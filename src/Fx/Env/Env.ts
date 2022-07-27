import { pipe } from 'hkt-ts'
import { isLeft } from 'hkt-ts/Either'

import { Fiber } from '../Fiber/Fiber.js'
import { Fx, Of, attempt, fromValue, getEnv, lazy, provide } from '../Fx/Fx.js'
import { never } from '../Fx/Instruction/Async.js'
import { fork, fromExit, join } from '../Fx/Instruction/Fork.js'
import { getScope } from '../Fx/Instruction/GetScope.js'
import { zipAll } from '../Fx/Instruction/ZipAll.js'
import type { Layer } from '../Layer/Layer.js'

import { Scope } from '@/Scope/Scope.js'
import * as Service from '@/Service/index.js'

export interface Env<R> {
  /**
   * Retrieve a Service from the environment
   */
  readonly get: <S extends R>(service: Service.Key<S>) => Of<S>

  /**
   * Add a Service to the environment, creating a *new* Environment
   */
  readonly add: <S, I extends S>(service: Service.Service<S>, implementation: I) => Env<R | S>

  /**
   * Add a Layer to the environment, creating a *new* Environment. Layers are instantiated asynchronously,
   * but are intrinsically tied to the Scope in which they were constructed from.
   */
  readonly addLayer: <R2, E, S>(layer: Layer<R2, E, S>) => Fx<R2, E, Env<R | S>>
}

export function Env<A, I extends A>(service: Service.Service<A>, implementation: I): Env<A> {
  return new Environment<A>(new Map<any, any>([[service, implementation]]), new Map(), new Map())
}

export class Environment<R> implements Env<R> {
  constructor(
    readonly services: Map<Service.Service<any>, R>,
    readonly layers: Map<Service.Service<any>, Of<R>>,
    readonly fibers: Map<Service.Service<any>, Fiber.Live<never, R>>,
  ) {}

  readonly get = <S extends R>(s: Service.Key<S>): Of<S> =>
    lazy(() => {
      if (s.tag === 'Service') {
        if (this.services.has(s)) {
          return fromValue(this.services.get(s) as S)
        }

        if (this.fibers.has(s)) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const fiber = this.fibers.get(s)!

          return Fx(function* () {
            return yield* fromExit(yield* fiber.exit)
          })
        }

        if (this.layers.has(s)) {
          return this.getLayer(s)
        }

        throw new Error(
          `Unable to find an implementation or Layer for Service: ${Service.formatServiceId(s)}`,
        )
      }

      if (s.tag === 'Tuple') {
        return zipAll(...s.services.map(this.get)) as any
      }

      const entries = Object.entries(s.services)
      const getServices = zipAll(...entries.map((e) => this.get(e[1])))

      return Fx(function* () {
        const services = yield* getServices

        return Object.fromEntries<any>(services.map((s, i) => [entries[i][0], s])) as S
      })
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
      const scope = yield* getScope()
      const env = yield* getEnv<R2>()
      const withScope = env.add(Scope, scope.fork())
      const provider = Fx(function* () {
        const exit = yield* pipe(layer.build, provide(withScope), attempt)

        if (isLeft(exit)) {
          // Place the exit onto the Outer Scope in which the Layer was provided
          yield* scope.close(exit)

          return yield* never
        } else {
          return exit.right
        }
      })

      return new Environment<
        R | S
      >(services, new Map<any, any>([...layers, [layer.build, provider]]), fibers)
    })
  }

  protected getLayer = <S extends R>(s: Service.Service<S>): Of<S> =>
    lazy(() => {
      const { services, layers, fibers } = this

      return Fx(function* () {
        const build = layers.get(s) as Of<S>
        const fiber = yield* fork(build)
        fibers.set(s, fiber)

        const a = yield* join(fiber)

        services.set(s, a)
        fibers.delete(s)

        return a
      })
    })
}
