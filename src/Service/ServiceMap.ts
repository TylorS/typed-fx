import { Just, Nothing } from 'hkt-ts/Maybe'

import { ServiceId } from '@/ServiceId/index'

export class ServiceMap<A> {
  constructor(readonly services = new Map<ServiceId<any>, A>()) {}

  readonly get = <S>(service: ServiceId<S>) =>
    this.services.has(service) ? Just(this.services.get(service) as A) : Nothing

  readonly getAll = (): ReadonlyArray<A> => Array.from(this.services.values())

  readonly set = <S>(service: ServiceId<S>, value: A) => {
    this.services.set(service, value)

    return value
  }

  readonly delete = <S>(service: ServiceId<S>) => {
    const current = this.get(service)

    this.services.delete(service)

    return current
  }

  readonly extend = <S, B>(id: ServiceId<S>, value: B) => {
    const extended = new Map<ServiceId<any>, A | B>(this.services)

    extended.set(id, value)

    return new ServiceMap(extended)
  }
}
