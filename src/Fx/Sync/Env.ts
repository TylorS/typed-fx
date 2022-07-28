import { Service, formatService } from '@/Service/index.js'

export interface Env<R> {
  readonly get: <S extends R>(service: Service<S>) => S
  readonly add: <S, I extends S>(service: Service<S>, implementation: I) => Env<R | S>
}

export function Env<S, I extends S>(service: Service<S>, implementation: I): Env<S> {
  return new Environment(new Map([[service, implementation]]))
}

export class Environment<R> implements Env<R> {
  constructor(readonly services: ReadonlyMap<Service<any>, any> = new Map()) {}

  readonly get: Env<R>['get'] = (s) => {
    if (!this.services.has(s)) {
      throw new Error(`Unable to find Service: ${formatService(s)}`)
    }

    return this.services.get(s)
  }

  readonly add: Env<R>['add'] = (service, implementation) =>
    new Environment(new Map([...this.services, [service, implementation]]))
}
