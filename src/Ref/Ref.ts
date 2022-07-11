/* eslint-disable @typescript-eslint/no-unused-vars */
import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { Fx } from '@/Fx/Fx'
import { withService } from '@/Fx/InstructionSet/Access'
import { fromLazy } from '@/Fx/index'
import { OutputOf, Service, ServiceId } from '@/Service/Service'
import { InstanceOf } from '@/internal'

export type RefApi<R extends Service<any>, E, A> = {
  readonly modify: <B>(f: (a: A) => readonly [B, A]) => Fx<R, E, B>
}

export type AnyRefApi = RefApi<any, any, any>

export type ExtractRefApi<S> = OutputOf<S> extends AnyRefApi ? OutputOf<S> : never

export type ExtractResources<S> = [OutputOf<S>] extends [RefApi<infer _R, infer _E, infer _A>]
  ? _R
  : never

export type ExtractErrors<S> = [OutputOf<S>] extends [RefApi<infer _R, infer _E, infer _A>]
  ? _E
  : never

export type ExtractOutput<S> = [OutputOf<S>] extends [RefApi<infer _R, infer _E, infer _A>]
  ? _A
  : never

export interface Ref<R extends Service<any>, E, A> extends ReturnType<make<R, E, A>> {}

export type AnyRef =
  | Ref<Service<any>, any, any>
  | Ref<Service<never>, never, any>
  | Ref<Service<never>, any, any>
  | Ref<Service<any>, never, any>

export const make = <R extends Service<any>, E, A>(initial: Fx<R, E, A>, Eq: Eq<A> = DeepEquals) =>
  class Ref extends Service<RefApi<R, E, A>> {
    static initial = initial
    static Eq = Eq

    static make<S extends AnyRef>(this: S, api: RefApi<R, E, A>) {
      return new this(api)
    }

    static modify<S extends AnyRef, B>(
      this: S,
      f: (a: A) => readonly [B, A],
    ): Fx<InstanceOf<S>, E, B> {
      return withService(this)((api) => api.modify(f))
    }

    static get<S extends AnyRef>(this: S): Fx<InstanceOf<S>, E, A> {
      return this.modify((s) => [s, s])
    }

    static set<S extends AnyRef>(this: S, a: A): Fx<InstanceOf<S>, E, A> {
      return this.modify(() => [a, a])
    }
  }
