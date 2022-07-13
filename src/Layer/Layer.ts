/* eslint-disable @typescript-eslint/no-unused-vars */

import { Fx } from '@/Fx/Fx'
import { InstanceOf } from '@/internal'

export class Layer<in out S, out R = never, out E = never> {
  constructor(readonly service: S, readonly provider: Fx<R, E, InstanceOf<S>>) {}
}

export type AnyLayer<R = any> =
  | Layer<R, any, any>
  | Layer<R, never, any>
  | Layer<R, never, never>
  | Layer<R, any, never>

export type ServiceOf<T> = T extends Layer<infer _S, infer _R, infer _E> ? InstanceOf<_S> : never

export type ResourcesOf<T> = T extends Layer<infer _S, infer _R, infer _E> ? _R : never

export type ErrorsOf<T> = T extends Layer<infer _S, infer _R, infer _E> ? _E : never

export function make<S, R = never, E = never>(
  service: S,
  provider: Fx<R, E, InstanceOf<S>>,
): Layer<S, R, E> {
  return new Layer(service, provider)
}
