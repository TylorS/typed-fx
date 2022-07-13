import { isJust, isNothing } from 'hkt-ts/Maybe'

import { AnyFiber } from '@/Fiber/Fiber'
import { Fx, Of } from '@/Fx/Fx'
import { fork } from '@/Fx/InstructionSet/Fork'
import { die, fromExit } from '@/Fx/InstructionSet/FromExit'
import { join } from '@/Fx/InstructionSet/Join'
import * as Layer from '@/Layer/Layer'
import { Service, ServiceConstructor, ServiceMap } from '@/Service/index'
import { InstanceOf } from '@/internal'

/**
 * An Environment contains any number of Services that can be retrieved
 */
export class Env<in out R> {
  constructor(
    readonly services = new ServiceMap<R>(),
    readonly layers = new ServiceMap<Layer.AnyLayer<R>>(),
    readonly fibers = new ServiceMap<AnyFiber>(),
  ) {}

  readonly get = <S extends ServiceConstructor>(service: S): Of<InstanceOf<S>> => {
    const { services, layers, fibers } = this
    const id = service.id()

    return Fx(function* () {
      const maybeService = services.get(id)

      if (isJust(maybeService)) {
        return maybeService.value
      }

      const maybeFiber = fibers.get(id)

      if (isJust(maybeFiber)) {
        return yield* fromExit(yield* maybeFiber.value.exit)
      }

      const maybeLayer = layers.get(id)

      if (isNothing(maybeLayer)) {
        return yield* die(new Error(`Unable to find Layer for Service: ${service.name}`))
      }

      const fiber = yield* fork(maybeLayer.value.provider)

      fibers.set(id, fiber)

      const a = (yield* join(fiber)) as R

      services.set(id, a)
      fibers.delete(id)

      return a
    }) as Of<InstanceOf<S>>
  }

  readonly addService = <S extends Service>(service: S): Env<R | S> =>
    new Env(this.services.extend(service.id, service), this.layers as any, this.fibers)

  readonly addLayer = <S extends Layer.AnyLayer>(layer: S): Env<R | Layer.ServiceOf<S>> =>
    new Env(this.services, this.layers.extend(layer.service.id, layer), this.fibers)
}

export function make<Services extends ReadonlyArray<Service>>(
  ...services: Services
): Env<Services[number]> {
  return new Env<Services[number]>(new ServiceMap(new Map(services.map((s) => [s.id, s]))))
}
