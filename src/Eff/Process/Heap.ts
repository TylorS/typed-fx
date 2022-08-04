import { identity, pipe } from 'hkt-ts'
import { Endomorphism } from 'hkt-ts/Endomorphism'
import { Just, Maybe, Nothing, isJust, isNothing, match } from 'hkt-ts/Maybe'

/**
 * A Heap is a glorified Map of `HeakKey`s to their values.
 * Their values should ALWAYS be immutable to ensure expected behaviors of
 * forking processes.
 */
export class Heap {
  protected readonly map: Map<HeapKey<any>, any>

  constructor(readonly entries: Iterable<readonly [HeapKey<any>, any]> = []) {
    this.map = new Map(entries)
  }

  *[Symbol.iterator]() {
    return yield* this.map
  }

  readonly get = <A>(key: HeapKey<A>): Maybe<A> =>
    this.map.has(key) ? Just(this.map.get(key)) : Nothing

  readonly getOrThrow = <A>(key: HeapKey<A>): A => {
    const maybe = this.get(key)

    if (isNothing(maybe)) {
      throw new Error(`Unable to ${key.name} in Heap`)
    }

    return maybe.value
  }

  readonly set = <A>(key: HeapKey<A>, value: A): A => {
    this.map.set(key, value)

    return value
  }

  readonly update = <A>(key: HeapKey<A>, f: Endomorphism<A>): Maybe<A> => {
    if (this.map.has(key)) {
      const updated = f(this.map.get(key))

      this.map.set(key, updated)

      return Just(updated)
    }

    return Nothing
  }

  readonly delete = <A>(key: HeapKey<A>) => this.map.delete(key)

  readonly clear = () => {
    this.map.clear()
  }

  readonly getOrCreate = <A>(key: HeapKey<A>, f: () => A): A => {
    if (this.map.has(key)) {
      return this.map.get(key)
    }

    const v = f()

    this.map.set(key, v)

    return v
  }

  readonly updateOrCreate = <A>(key: HeapKey<A>, create: () => A, update: Endomorphism<A>): A => {
    const current = this.getOrCreate(key, create)
    const updated = update(current)

    this.map.set(key, updated)

    return updated
  }

  readonly fork = () => {
    const map = new Map<HeapKey<any>, any>()

    for (const [key, value] of this.map) {
      const maybe = key.fork(value)

      if (isJust(maybe)) {
        map.set(key, maybe.value)
      }
    }

    return new Heap(map)
  }

  readonly join = (other: Heap) => {
    for (const [k, v] of other) {
      this.set(
        k,
        pipe(
          this.get(k),
          match(
            () => v,
            (c) => k.join(c, v),
          ),
        ),
      )
    }
  }
}

/**
 * A HeapKey uses reference as ID, and describes
 * how to Fork a value into a new Heap and for how
 * to rejoin them.
 */
export interface HeapKey<A> {
  readonly name: string
  readonly fork: (a: A) => Maybe<A>
  readonly join: (first: A, second: A) => A
}

export const HeapKey = <A>(
  name: string,
  fork: HeapKey<A>['fork'] = Just,
  join: HeapKey<A>['join'] = identity,
): HeapKey<A> => ({
  name,
  fork,
  join,
})
