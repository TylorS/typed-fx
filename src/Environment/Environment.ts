import { match } from 'hkt-ts/Maybe'
import { Associative } from 'hkt-ts/Typeclass/Associative'
import { Identity } from 'hkt-ts/Typeclass/Identity'
import { pipe } from 'hkt-ts/function'

import { OutputOf, Service, ServiceMap } from '@/Service/index'
import { InstanceOf } from '@/internal'

/**
 * An Environment contains any number of Services that can be retrieved
 */
export class Environment<in out R extends Service<any>> {
  constructor(private services = new ServiceMap<R>()) {}

  readonly getAll = this.services.getAll

  readonly get = <S extends typeof Service<any>>(service: S) =>
    pipe(
      this.services.get(service.id()),
      match(
        () => {
          throw new Error(
            `Unable to find Service implementation in Environment for: ${service.name}`,
          )
        },
        (r) => r.implementation as OutputOf<Extract<R, InstanceOf<S>>>,
      ),
    )

  readonly extend = <S extends Service<any>>(service: S): Environment<R | S> =>
    new Environment(this.services.extend(service.id, service))
}

export function Env<Services extends ReadonlyArray<Service<any>>>(
  ...services: Services
): Environment<Services[number]> {
  return new Environment<Services[number]>(new ServiceMap(new Map(services.map((s) => [s.id, s]))))
}

export const makeAssociative = <R extends Service<any>>(): Associative<Environment<R>> => ({
  concat: (a, b) => Env(...a.getAll(), ...b.getAll()),
})

export const makeIdentity = <R extends Service<any>>(): Identity<Environment<R>> => ({
  ...makeAssociative<R>(),
  id: new Environment<R>(),
})
