import { Fx } from '@/Fx/Fx'
import { ask, asks, provideService } from '@/Fx/InstructionSet/Access'
import { success } from '@/Fx/InstructionSet/FromExit'
import { Layer, make as makeLayer } from '@/Layer/Layer'
import { ServiceId } from '@/ServiceId/index'
import { InstanceOf } from '@/internal'

// A WeakMap is used to allow ServiceIds to be garbage collected when no longer useful.
const serviceIds = new WeakMap<object, ServiceId<any>>()

export class Service {
  readonly name: string
  readonly id: ServiceId<this> = (this.constructor as typeof Service).id() as ServiceId<this>

  constructor() {
    this.name = this.constructor.name
  }

  // Lazy getter for creating unique ID's for each of your services.
  static id<S extends object>(this: S): ServiceId<InstanceOf<S>> {
    const s = serviceIds.get(this)

    if (s !== undefined) {
      return s
    }

    const id = ServiceId<InstanceOf<S>>((this as typeof Service).name)

    serviceIds.set(this, id)

    return id
  }

  static ask<S extends ServiceConstructor>(this: S): Fx<InstanceOf<S>, never, InstanceOf<S>> {
    return ask(this)
  }

  static asks<S extends ServiceConstructor, A>(
    this: S,
    f: (a: InstanceOf<S>) => A,
  ): Fx<InstanceOf<S>, never, A> {
    return asks(this)(f)
  }

  static layer<S extends ServiceConstructor, R = never, E = never>(
    this: S,
    provider: Fx<R, E, InstanceOf<S>>,
  ): Layer<S, R, E> {
    return makeLayer<S, R, E>(this, provider)
  }

  static layerOf<S extends ServiceConstructor, B extends InstanceOf<S>>(
    this: S,
    instance: B,
  ): Layer<S> {
    return makeLayer<S>(this, success<InstanceOf<S>>(instance))
  }

  static provide<S extends ServiceConstructor, B extends InstanceOf<S>>(this: S, instance: B) {
    return provideService(this, instance)
  }
}

/**
 * ServiceConstructor type, primarily useful for constraining function/type parameters.
 */
export type ServiceConstructor<A = any> = {
  readonly id: () => ServiceId<A>
  readonly name: string
}
