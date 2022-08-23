import { Scope } from 'ts-morph'

import { Service } from './Service.js'

import { Env } from '@/Env/Env.js'
import { Fx, RIO, ask } from '@/Fx/Fx.js'
import type { Layer } from '@/Layer/Layer.js'
import { PROVIDEABLE, Provideable } from '@/Provideable/index.js'

const idCache = new WeakMap<object, Service<any>>()

export type InstanceOf<T> = T extends new (...args: any) => infer R ? R : T

/**
 * Extendable class for constructing a Service
 */
export class Id {
  /**
   * The ID of the Service.
   *
   * Unfortunately, in order to get type-inference the way we'd like this must
   * currently be a method to access the "this" type in sub-classes.
   */
  static id<S extends { readonly name: string }>(this: S): Service<InstanceOf<S>> {
    return getCachedId(this)
  }

  // Replicate the same ID to the instance.
  readonly id: Service<this> = (this.constructor as any).id()

  /**
   * Retrieve this service at Runtime, requiring it from the given Environment.
   */
  static ask<
    S extends {
      readonly id: () => Service<any>
      new (...args: any): any
    },
  >(this: S): RIO<InstanceOf<S>, InstanceOf<S>> {
    return ask(this.id())
  }

  /**
   * Construct a Layer that provides this service.
   */
  static layer<
    S extends {
      readonly id: () => Service<any>
      new (...args: any): any
    },
    R,
    E,
  >(this: S, provider: Fx<R | Scope, E, InstanceOf<S>>): Layer<R, E, InstanceOf<S>> {
    return {
      service: this.id(),
      provider,
    } as Layer<R, E, InstanceOf<S>>
  }

  /**
   * Add the instance of this service to the given Environment.
   */
  public add<R>(env: Provideable<R>): Env<R | this> {
    return env[PROVIDEABLE]().add(this.id, this)
  }

  /**
   * Implement the PROVIDEABLE interface for "this"
   */
  [PROVIDEABLE](): Env<this> {
    return this.add(Env.empty)
  }
}

/**
 * Helper for constructing IDs that are tied to a particular object, which much have
 * a name to create the Service Key. Particularly useful for creating Class declarations for Services.
 *
 * @example
 * import * as S from '@typed/fx/Service'
 * import * as Fx from '@typed/fx/Fx'
 *
 * class Foo {
 *   static id = S.getCachedId(this)
 *
 *   constructor(readonly foo: string) {}
 * }
 *
 * const program = Fx.Fx(function*(){
 *   const { foo }: Foo = yield* Fx.ask(Foo.id)
 *a
 *   return foo // string
 * })
 */
export function getCachedId<S extends { readonly name: string }>(key: S): Service<InstanceOf<S>> {
  if (idCache.has(key)) {
    return idCache.get(key) as Service<InstanceOf<S>>
  }

  const s = Service<InstanceOf<S>>(key.name)

  idCache.set(key, s)

  return s
}
