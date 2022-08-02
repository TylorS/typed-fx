import { Maybe, fromNullable, isJust } from 'hkt-ts/Maybe'

export class WeakValueMap<K, V extends object> {
  #map = new Map<K, WeakRef<V>>()
  #registry = new FinalizationRegistry((key: K) => {
    this.#map.delete(key)
  })

  #delete(key: K): boolean {
    const value = this.#map.get(key)

    if (value !== undefined) {
      this.#registry.unregister(value)
    }

    return this.#map.delete(key)
  }

  [Symbol.toStringTag] = 'WeakValueMap'

  get size(): number {
    return this.#map.size
  }

  readonly get = (key: K): Maybe<V> => {
    return fromNullable<V>(this.#map.get(key)?.deref())
  }

  readonly set = (key: K, value: V): this => {
    this.#delete(key)
    this.#registry.register(value, key, value)
    this.#map.set(key, new WeakRef(value))
    return this
  }

  readonly has = (key: K): boolean => {
    return this.#map.has(key)
  }

  readonly delete = (key: K): boolean => {
    return this.#delete(key)
  }

  readonly clear = (): void => {
    for (const key of this.#map.keys()) {
      this.#delete(key)
    }
  }

  readonly forEach = (
    callbackfn: (value: V, key: K, map: WeakValueMap<K, V>) => void,
    thisArg?: any,
  ): void => {
    for (const [key, value] of this.entries()) {
      callbackfn.call(thisArg, value, key, this)
    }
  };

  *entries(): IterableIterator<readonly [K, V]> {
    for (const key of this.#map.keys()) {
      const maybe = this.get(key)

      if (isJust(maybe)) {
        yield [key, maybe.value]
      }
    }
  }

  *keys(): IterableIterator<K> {
    for (const key of this.#map.keys()) {
      yield key
    }
  }

  *values(): IterableIterator<V> {
    for (const [, value] of this.entries()) {
      yield value
    }
  }

  *[Symbol.iterator](): IterableIterator<readonly [K, V]> {
    yield* this.entries()
  }
}
