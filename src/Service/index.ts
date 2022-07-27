import { Tagged } from '@/Tagged/index.js'

/**
 * The Definition/ID of a Service
 */
export type Service<S> = Tagged<
  {
    readonly Service: Service<S>
  },
  symbol
>

/**
 * Construct a Service, the provided name is used for debugging purposes and is required.
 */
export const Service = <S>(name: string): Service<S> => Tagged<Service<S>>()(Symbol(name))

/**
 * Extract the output of a Service
 */
export type OutputOf<T> = [T] extends [Service<infer S>] ? S : never

const symbolRegex = /^Symbol/i
const serviceText = 'Service'

/**
 * Format a Service's into a string.
 */
export function formatService<A>(service: Service<A>) {
  return service.toString().replace(symbolRegex, serviceText)
}

const idCache = new WeakMap<object, Service<any>>()

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
  static id<S extends { readonly name: string }>(this: S) {
    return getCachedId(this)
  }

  // Replicate the same ID to the instance.
  readonly id: Service<this> = (this.constructor as any).id()
}

/**
 * Sometimes it is necessary to tag a Service to ensure it is considered different from another at the type-level.
 */
export const tagged = <Tag extends string>(tag: Tag) =>
  class TaggedService extends Id {
    static tag: Tag = tag
    readonly tag: Tag = tag
  }
