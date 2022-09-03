import { pipe } from 'hkt-ts'
import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { Env } from '@/Env/Env.js'
import * as Fx from '@/Fx/index.js'
import { Id, InstanceOf } from '@/Service/index.js'

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

export type Ref<R, E, A> = ReturnType<typeof Ref<any, R, E, A>>

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

export function Ref<Tag extends string, R, E, A>(
  tag: Tag,
  initial: Fx.Fx<R, E, A>,
  Eq: Eq<A> = DeepEquals,
) {
  return class Reference extends Id implements RefApi<R, E, A> {
    static tag: Tag = tag
    readonly tag: Tag = tag

    static initial = initial
    static Eq = Eq

    constructor(readonly get: RefApi<R, E, A>['get'], readonly modify: RefApi<R, E, A>['modify']) {
      super()
    }

    static make<S extends AnyRef>(
      this: S,
      get: RefApi<R, E, A>['get'],
      modify: RefApi<R, E, A>['modify'],
    ): InstanceOf<S> {
      return new (this as Ref<R, E, A>)(get, modify) as InstanceOf<S>
    }

    static get<S extends typeof Reference>(this: S): Fx.Fx<R | InstanceOf<S>, E, A> {
      return pipe(
        Fx.access((env: Env<InstanceOf<S>>) => env.get(this.id())),
        Fx.flatMap((r) => r.get),
      )
    }

    static modify<S extends typeof Reference, B, R2, E2>(
      this: S,
      f: (a: A) => Fx.Fx<R2, E2, readonly [B, A]>,
    ): Fx.Fx<R | R2 | InstanceOf<S>, E | E2, B> {
      return pipe(
        Fx.access((env: Env<InstanceOf<S>>) => env.get(this.id())),
        Fx.flatMap((r) => r.modify(f)),
      )
    }

    static set<S extends typeof Reference>(this: S, value: A): Fx.Fx<R | InstanceOf<S>, E, A> {
      return pipe(
        Fx.access((env: Env<InstanceOf<S>>) => env.get(this.id())),
        Fx.flatMap((r) => r.modify(() => Fx.now([value, value] as const))),
      )
    }
  }
}
