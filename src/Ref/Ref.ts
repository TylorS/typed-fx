import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/index.js'
import { PROVIDEABLE, Provideable } from '@/Provideable/index.js'
import { Id, InstanceOf, Service } from '@/Service/index.js'

export interface RefApi<R, E, A> {
  readonly get: Fx.Fx<R, E, A>
  readonly modify: <R2, E2, B>(
    f: (a: A) => Fx.Fx<R2, E2, readonly [B, A]>,
  ) => Fx.Fx<R | R2, E | E2, B>
}

export type AnyRefApi =
  | RefApi<any, any, any>
  | RefApi<never, never, any>
  | RefApi<never, any, any>
  | RefApi<any, never, any>

export type Ref<R, E, A> = ReturnType<typeof Ref<R, E, A>>

export type AnyRef =
  | Ref<any, any, any>
  | Ref<never, never, any>
  | Ref<never, any, any>
  | Ref<any, never, any>

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = T extends Ref<infer _R, infer _E, infer _A> ? _R : never
export type ErrorsOf<T> = T extends Ref<infer _R, infer _E, infer _A> ? _E : never
export type OutputOf<T> = T extends Ref<infer _R, infer _E, infer _A> ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */

export function Ref<R, E, A>(initial: Fx.Fx<R, E, A>, Eq: Eq<A> = DeepEquals) {
  return class Reference extends Id implements RefApi<R, E, A> {
    static initial = initial
    static Eq = Eq

    constructor(readonly get: RefApi<R, E, A>['get'], readonly modify: RefApi<R, E, A>['modify']) {
      super()
    }

    static make<S extends AnyRefConstructor>(
      this: S,
      get: RefApi<R, E, A>['get'],
      modify: RefApi<R, E, A>['modify'],
    ): InstanceOf<S> {
      return new (this as RefConstructor<R, E, A>)(get, modify) as InstanceOf<S>
    }

    static get<S extends AnyRefConstructor>(this: S) {
      return Fx.access((env: Env<InstanceOf<S>>) => env.get(this.id()).get)
    }

    static modify<S extends AnyRefConstructor, B>(this: S, f: (a: A) => readonly [B, A]) {
      return Fx.access((env: Env<InstanceOf<S>>) => env.get(this.id()).modify(f))
    }

    /**
     * Add this service to the given Environment.
     */
    readonly add = <R>(env: Provideable<R>): Env<R | this> => env[PROVIDEABLE]().add(this.id, this);

    /**
     * Implement the PROVIDEABLE interface for "this"
     */
    readonly [PROVIDEABLE]: Provideable<this>[PROVIDEABLE] = () => this.add(Env.empty)
  }
}

export interface RefConstructor<R, E, A> {
  readonly id: () => Service<any>
  readonly initial: Fx.Fx<R, E, A>
  readonly Eq: Eq<A>

  new (get: RefApi<R, E, A>['get'], modify: RefApi<R, E, A>['modify']): RefApi<R, E, A>

  readonly make: <S extends AnyRefConstructor>(
    this: S,
    get: RefApi<R, E, A>['get'],
    modify: RefApi<R, E, A>['modify'],
  ) => InstanceOf<S>
}

export type AnyRefConstructor = RefConstructor<any, any, any>
