import { Branded } from 'hkt-ts/Branded'

import { InstanceOf } from '@/internal'

// A WeakMap is used to allow ServiceIds to be garbage collected when no longer useful.
const serviceIds = new WeakMap<typeof Service<any>, ServiceId<any>>()

export type ServiceId<S> = Branded<{ readonly ServiceId: S }, symbol>
export const ServiceId = <S>(name: string) => Branded<ServiceId<S>>()(Symbol(name))

export abstract class Service<A> {
  // Lazy getter for creating unique ID's for each of your services.
  static id<S extends typeof Service<any>>(this: S): ServiceId<InstanceType<S>> {
    const s = serviceIds.get(this)

    if (s !== undefined) {
      return s
    }

    const id = ServiceId<InstanceOf<S>>(this.name)

    serviceIds.set(this, id)

    return id
  }

  readonly name: string
  readonly id: ServiceId<this> = (this.constructor as typeof Service<A>).id()

  constructor(public implementation: A) {
    this.name = this.constructor.name
  }
}

export type OutputOf<T> = InstanceOf<T> extends Service<infer R>
  ? R
  : T extends Service<infer R>
  ? R
  : never
