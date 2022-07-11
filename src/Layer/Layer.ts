/* eslint-disable @typescript-eslint/no-unused-vars */
import { Just, Maybe } from 'hkt-ts/Maybe'
import { second } from 'hkt-ts/function'

import { AnyFxGenerator, ErrorsFromGenerator, Fx, ResourcesFromGenerator } from '@/Fx/Fx'
import type { OutputOf, Service } from '@/Service/Service'
import { InstanceOf } from '@/internal'

export class Layer<
  in out S extends typeof Service<any> = never,
  out R extends Service<any> = never,
  out E = never,
> {
  readonly options: LayerOptions<S>

  constructor(
    readonly service: S,
    readonly provider: Fx<R, E, InstanceOf<S>>,
    options: Partial<LayerOptions<S>> = {},
  ) {
    this.options = {
      global: true,
      overridable: false,
      fork: Just,
      join: second,
      ...options,
    }
  }
}

export interface LayerOptions<S extends typeof Service<any>> {
  readonly global: boolean
  readonly overridable: boolean
  readonly fork: (service: OutputOf<S>) => Maybe<OutputOf<S>>
  readonly join: (current: OutputOf<S>, updated: OutputOf<S>) => OutputOf<S>
}

export type AnyLayer =
  | Layer<any, any, any>
  | Layer<any, never, any>
  | Layer<any, never, never>
  | Layer<any, any, never>

export type ServiceOf<T> = T extends Layer<infer _S, infer _R, infer _S> ? InstanceOf<_S> : never

export type ResourcesOf<T> = T extends Layer<infer _S, infer _R, infer _E> ? _R : never

export type ErrorsOf<T> = T extends Layer<infer _S, infer _R, infer _E> ? _E : never

export function make<S extends typeof Service<any>, R extends Service<any>, E>(
  service: S,
  provider: Fx<R, E, InstanceOf<S>>,
  options: Partial<LayerOptions<S>> = {},
): Layer<S, R, E> {
  return new Layer(service, provider, options)
}

export function makeFromGenerator<S extends typeof Service<any>>(service: S) {
  return <G extends AnyFxGenerator<OutputOf<InstanceOf<S>>>>(
    gen: () => G,
    options: Partial<LayerOptions<S>> = {},
  ): Layer<S, ResourcesFromGenerator<G>, ErrorsFromGenerator<G>> =>
    make(
      service,
      Fx(function* () {
        return new (service as any)(yield* gen()) as InstanceOf<S>
      }),
      options,
    )
}
