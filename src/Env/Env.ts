import { isJust, isNothing } from 'hkt-ts/Maybe'
import { NonEmptyArray, isNonEmpty } from 'hkt-ts/NonEmptyArray'
import { Strict } from 'hkt-ts/Typeclass/Eq'

import { Atomic } from '@/Atomic/Atomic'
import * as DiGraph from '@/DiGraph/index'
import { addEdge, getStronglyConnectedComponents } from '@/DiGraph/index'
import { AnyFiber } from '@/Fiber/Fiber'
import { Fx, Of } from '@/Fx/Fx'
import { Access } from '@/Fx/InstructionSet/Access'
import { fork } from '@/Fx/InstructionSet/Fork'
import { die, fromExit } from '@/Fx/InstructionSet/FromExit'
import { AnyInstruction } from '@/Fx/InstructionSet/Instruction'
import { lazy } from '@/Fx/index'
import { join } from '@/Fx/join'
import * as Layer from '@/Layer/Layer'
import { Service, ServiceConstructor, ServiceMap } from '@/Service/index'
import { ServiceId } from '@/ServiceId/index'
import { InstanceOf } from '@/internal'

/**
 * An Environment contains any number of Services that can be retrieved
 */
export class Env<out R = never> {
  constructor(
    readonly services = new ServiceMap<any>(),
    readonly layers = new ServiceMap<Layer.AnyLayer<any>>(),
    readonly fibers = new ServiceMap<AnyFiber>(),
    readonly dependencyGraph = new Atomic(DiGraph.make<ServiceId<any>>([]), Strict),
  ) {}

  readonly get = <S extends ServiceConstructor>(service: S): Of<InstanceOf<S>> =>
    this.getById<InstanceOf<S>>(service.id(), service.name)

  readonly addService = <S extends ServiceConstructor, B extends InstanceOf<S>>(
    service: S,
    implementation: B,
  ): Env<R | InstanceOf<S> | B> =>
    new Env(
      this.services
        .extend<S, InstanceOf<S>>(service.id(), implementation)
        .extend((implementation as Service).id, implementation),
      this.layers as ServiceMap<Layer.AnyLayer<R | InstanceOf<S>>>,
      this.fibers,
      this.dependencyGraph,
    )

  readonly addLayer = <S extends Layer.AnyLayer>(layer: S): Env<R | Layer.ServiceOf<S>> =>
    new Env(
      this.services,
      this.layers.extend(layer.service.id(), layer),
      this.fibers,
      this.dependencyGraph,
    )

  readonly refreshLayer = <S extends Layer.AnyLayer>(layer: S): Of<InstanceOf<S>> => {
    return lazy(() => {
      const id = layer.service.id()
      const current = this.layers.get(id)
      const refresh = this.getById<InstanceOf<S>>(id, layer.service.name)

      if (isJust(current)) {
        this.services.delete(id)
      }

      if (isNothing(current)) {
        return die(
          new Error(
            `Layer Refresh Error: Unable to refresh Layer for ${id.description} as it has not been provided to this Env before.`,
          ),
        )
      }

      return refresh
    })
  }

  readonly getById = <A>(id: ServiceId<A>, name: string): Of<A> => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    return Fx(function* () {
      // Attempt to retrieve memoized instance of Serivce
      const maybeService = that.services.get(id)
      if (isJust(maybeService)) {
        return maybeService.value
      }

      // Attempt to retrieve a running Fiber for Layer of a Service
      const maybeFiber = that.fibers.get(id)
      if (isJust(maybeFiber)) {
        return yield* fromExit(yield* maybeFiber.value.exit)
      }

      // Attempt to find the Layer
      const maybeLayer = that.layers.get(id)

      // This should be pretty much impossible, but if you ask for an unknown Service, fail immediately.
      if (isNothing(maybeLayer)) {
        return yield* die(new Error(`Unable to find Layer for Service: ${name}`))
      }

      // Fork a Fiber for sharing with other instances
      const fiber = yield* fork(trackDependencies(id, that, maybeLayer.value.provider))

      that.fibers.set(id, fiber)

      const a = (yield* join(fiber)) as R

      that.services.set(id, a)
      that.fibers.delete(id)

      return a
    }) as Of<A>
  }
}

export function make<Services extends ReadonlyArray<Service> = never>(
  ...services: Services
): Env<Services[number]> {
  return new Env<Services[number]>(new ServiceMap(new Map(services.map((s) => [s.id, s]))))
}

export const makeCircularDependenciesMessage = (
  circularDependencies: readonly NonEmptyArray<ServiceId<any>>[],
) =>
  `Circular dependency amongst Layers:\n  ${circularDependencies
    .map((components) =>
      [...components.map((c) => c.description), components[0].description].join(' -> '),
    )
    .join('\n  ')}\n`

/**
 * Wraps an Env with the ability to track dependencies between different layers.
 */
function trackDependencies<R, E, A>(id: ServiceId<any>, env: Env<R>, fx: Fx<R, E, A>): Fx<R, E, A> {
  return Fx(function* () {
    const gen = fx[Symbol.iterator]()
    const result = gen.next()

    while (!result.done) {
      const instr = result.value as AnyInstruction

      if (instr.is(Access)) {
        return yield* instr.input({
          ...env,
          get: (s) =>
            lazy(() => {
              env.dependencyGraph.update(addEdge([id, s.id()]))

              // Double-check we haven't created any Circular dependencies
              const circularDependencies = getStronglyConnectedComponents(env.dependencyGraph.get)
              if (isNonEmpty(circularDependencies)) {
                return die(new Error(makeCircularDependenciesMessage(circularDependencies)))
              }

              return env.get(s)
            }),
        })
      } else {
        yield instr
      }
    }

    return result.value
  })
}
