import type { Sync } from './Sync'

import { Eff } from '@/Eff/index'
import { Service } from '@/Service/index'

export class Env<R = never> {
  constructor(readonly services: Map<Service<any>, any> = new Map()) {}

  readonly get = <A extends R>(service: Service<A>): A => {
    if (!this.services.has(service)) {
      throw new Error(`Service '${service.toString()}' has not been properly provided for.`)
    }

    return this.services.get(service)
  }

  readonly extend = <A extends R, B extends A>(service: Service<A>, impl: B): Env<R | A> =>
    new Env(new Map([...this.services, [service, impl]]))
}

export class Access<R, Y, R2, N> implements Eff<Y | Access<R, Y, R2, N>, R2, R2> {
  readonly tag = 'Access'
  constructor(readonly access: (env: Env<R>) => Eff<Y, R2, N>) {}

  *[Symbol.iterator]() {
    return (yield this as Access<R, Y, R2, N>) as R2
  }
}

export function access<R, R2, E, A>(f: (env: Env<R>) => Sync<R2, E, A>): Sync<R | R2, E, A>
export function access<R, Y, R2, N>(
  f: (env: Env<R>) => Eff<Y, R2, N>,
): Eff<Y | Access<R, Y, R2, N>, R2, R2>

export function access<R, Y, R2, N>(
  f: (env: Env<R>) => Eff<Y, R2, N>,
): Eff<Y | Access<R, Y, R2, N>, R2, R2> {
  return new Access(f)
}

export function provide<R2>(env: Env<R2>) {
  return <Y, R, N>(
    eff: Eff<Y | Access<R2, any, any, any>, R, N>,
  ): Eff<Exclude<Y, Access<R2, any, any, any>>, R, N> =>
    Eff(function* () {
      const gen = eff[Symbol.iterator]()
      let result = gen.next()

      while (!result.done) {
        const instr = result.value

        if (instr instanceof Access<R2, any, any, any>) {
          result = gen.next(yield* instr.access(env))
        } else {
          result = gen.next((yield instr) as N)
        }
      }

      return result.value
    })
}
