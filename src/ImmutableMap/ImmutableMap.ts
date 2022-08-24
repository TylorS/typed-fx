import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'

/**
 * ImmutableMap is a small wrapper around ReadonlyMap that makes it a little
 * easier to deal wih immutable data.
 */
export interface ImmutableMap<K, V> extends Iterable<readonly [K, V]> {
  readonly get: (key: K) => Maybe<V>
  readonly set: (key: K, value: V) => ImmutableMap<K, V>
  readonly remove: (key: K) => ImmutableMap<K, V>
}

export function ImmutableMap<K, V>(cache: ReadonlyMap<K, V> = new Map()): ImmutableMap<K, V> {
  return new ImmutableMapImpl<K, V>(cache)
}

class ImmutableMapImpl<K, V> implements ImmutableMap<K, V> {
  constructor(readonly cache: ReadonlyMap<K, V> = new Map()) {}

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
  readonly set = (key: K, value: V): ImmutableMap<K, V> =>
    ImmutableMap(new Map([...this.cache, [key, value]]))

  /**
   * Removes the key from the map, returning a new ImmutableMap with the key removed.
   */
  readonly remove = (key: K): ImmutableMap<K, V> =>
    ImmutableMap(new Map([...this.cache].filter(([k]) => k !== key)));

  *[Symbol.iterator]() {
    return yield* this.cache
  }
}
