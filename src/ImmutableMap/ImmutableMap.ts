import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'

/**
 * ImmutableMap is a small wrapper around ReadonlyMap that makes it a little
 * easier to deal wih immutable data.
 */
export interface ImmutableMap<K, V> extends Iterable<readonly [K, V]> {
  readonly has: (key: K) => boolean
  readonly get: (key: K) => Maybe<V>
  readonly set: <K2, V2>(key: K2, value: V2) => ImmutableMap<K | K2, V | V2>
  readonly remove: (key: K) => ImmutableMap<K, V>
  readonly keys: () => Iterable<K>
  readonly values: () => Iterable<V>
  readonly joinWith: (other: ImmutableMap<K, V>, join: (v: V, v2: V) => V) => ImmutableMap<K, V>
}

export function ImmutableMap<K, V>(cache: ReadonlyMap<K, V> = new Map()): ImmutableMap<K, V> {
  return new ImmutableMapImpl<K, V>(cache)
}

class ImmutableMapImpl<K, V> implements ImmutableMap<K, V> {
  constructor(readonly cache: ReadonlyMap<K, V> = new Map()) {}

  readonly has = (key: K) => this.cache.has(key)

  /**
   * Retrieves the current value of the key, if it exists.
   */
  readonly get = (key: K): Maybe<V> => {
    // Attempt to get the value from the cache
    if (this.cache.has(key)) {
      return Just(this.cache.get(key) as V)
    }

    return Nothing
  }

  /**
   * Sets the value of the key, returning a new ImmutableMap with the new value.
   */
  readonly set = <K2, V2>(key: K2, value: V2): ImmutableMap<K | K2, V | V2> =>
    ImmutableMap(new Map<K | K2, V | V2>([...this.cache, [key, value]]))

  /**
   * Removes the key from the map, returning a new ImmutableMap with the key removed.
   */
  readonly remove = (key: K): ImmutableMap<K, V> =>
    ImmutableMap(new Map([...this.cache].filter(([k]) => k !== key)))

  readonly joinWith = (
    incoming: ImmutableMap<K, V>,
    join: (v: V, v2: V) => V,
  ): ImmutableMap<K, V> => {
    const outgoing = new Map(this.cache)

    Array.from(incoming).forEach(([key, value]) => {
      if (outgoing.has(key)) {
        outgoing.set(key, join(outgoing.get(key) as V, value))
      } else {
        outgoing.set(key, value)
      }
    })

    return new ImmutableMapImpl(outgoing)
  };

  *[Symbol.iterator]() {
    return yield* this.cache
  }

  readonly keys = () => this.cache.keys()
  readonly values = () => this.cache.values()
}
