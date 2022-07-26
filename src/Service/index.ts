import { HKT, Params } from 'hkt-ts'
import { ReadonlyRecord } from 'hkt-ts/Record'
import * as AB from 'hkt-ts/Typeclass/AssociativeBoth'

import { Tagged } from '@/Tagged/index.js'

/**
 * The Definition/ID of a Service
 */
export type Service<S> = Tagged<
  { readonly ServiceKey: Service<S> },
  { readonly tag: 'Service'; readonly id: symbol }
>

/**
 * Construct a Service, the provided name is used for debugging purposes and is required.
 */
export const Service = <S>(name: string) =>
  Tagged<Service<S>>()({ tag: 'Service', id: Symbol(name) })

/**
 * Extract the output of a Service
 */
export type OutputOf<T> = T extends Key<infer S> ? S : never

/**
 * A Lookup key of a Service or multiple Services
 */
export type Key<S> = Service<S> | TupleKey<S> | StructKey<S>

export type TupleKey<S> = Tagged<
  { readonly ServiceKey: TupleKey<S> },
  {
    readonly tag: 'Tuple'
    readonly services: ReadonlyArray<Key<any>>
  }
>

/**
 * Construct a Lookup key which returns a Tuple of Service instances.
 */
export const tuple = <Services extends ReadonlyArray<Key<any>>>(
  ...services: Services
): TupleKey<{ readonly [K in keyof Services]: OutputOf<Services[K]> }> =>
  Tagged<TupleKey<{ readonly [K in keyof Services]: OutputOf<Services[K]> }>>()({
    tag: 'Tuple',
    services,
  })

export type StructKey<S> = Tagged<
  { readonly ServiceKey: StructKey<S> },
  {
    readonly tag: 'Struct'
    readonly services: ReadonlyRecord<string, Key<any>>
  }
>

/**
 * Construct a Lookup Key which returns a struct of Service instances
 */
export const struct = <Services extends ReadonlyRecord<string, Key<any>>>(
  services: Services,
): StructKey<{ readonly [K in keyof Services]: OutputOf<Services[K]> }> =>
  Tagged<StructKey<{ readonly [K in keyof Services]: OutputOf<Services[K]> }>>()({
    tag: 'Struct',
    services,
  })

export interface ServiceKeyHKT extends HKT {
  readonly type: Key<this[Params.A]>
}

export const AssociativeBoth: AB.AssociativeBoth<ServiceKeyHKT> = {
  both: (s) => (f) => tuple(f, s),
}

export const both = AssociativeBoth.both
