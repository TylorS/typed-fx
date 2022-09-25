import { pipe } from 'hkt-ts/function'

import { Service } from './Service.js'

import { Fx, RIO, ask, flatMap, fromLazy } from '@/Fx/Fx.js'
import * as Layer from '@/Layer/Layer.js'
import { Scope } from '@/Scope/Scope.js'

const idCache = new WeakMap<object, Service<any>>()

export type InstanceOf<T> = T extends new (...args: any) => infer R ? R : T

/**
 * Extendable class for constructing a Service
 */
export class Id {
  readonly name: string = this.constructor.name

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
   * Retrieve this service at Runtime, requiring it from the given Environment.
   */
  static with<
    S extends {
      readonly id: () => Service<any>
      new (...args: any): any
    },
    R2,
    E2,
    B,
  >(this: S, f: (s: InstanceOf<S>) => Fx<R2, E2, B>): Fx<R2 | InstanceOf<S>, E2, B> {
    return pipe(ask(this.id()), flatMap(f))
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
  >(this: S, provider: Fx<R | Scope, E, InstanceOf<S>>): Layer.Layer<R, E, InstanceOf<S>> {
    return Layer.fromFx(this.id(), provider)
  }

  static layerOf<
    S extends {
      readonly id: () => Service<any>
      new (...args: any): any
    },
  >(this: S, ...args: ConstructorParameters<S>): Layer.Layer<never, never, InstanceOf<S>> {
    return Layer.fromFx(
      this.id(),
      fromLazy(() => new this(...(args as any))),
    )
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
