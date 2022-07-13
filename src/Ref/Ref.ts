import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import { Fx } from '@/Fx/Fx'
import { Service } from '@/Service/Service'
import { InstanceOf } from '@/internal'

export type Ref<R, E, A> = ReturnType<typeof make<R, E, A>>

export function make<R, E, A>(initial: Fx<R, E, A>, Eq: Eq<A> = DeepEquals) {
  return class Ref extends Service {
    static initial: Fx<R, E, A> = initial
    static Eq: Eq<A> = Eq

    constructor(readonly modify: ModifyReference<R, E, A>) {
      super()
    }

    static make<REF extends AnyRef>(this: REF, modify: ModifyReference<R, E, A>): InstanceOf<REF> {
      return new this(modify as any) as InstanceOf<REF>
    }

    static modify<REF extends AnyRef, B>(
      this: REF,
      f: (a: A) => readonly [B, A],
    ): Fx<R | InstanceOf<REF>, E, B> {
      const get = this.ask()

      return Fx(function* () {
        const ref = yield* get

        return yield* ref.modify(f)
      })
    }

    static get<REF extends AnyRef>(this: REF): Fx<R | InstanceOf<REF>, E, A> {
      return this.modify((s) => [s, s])
    }
  }
}

export type ModifyReference<R, E, A> = <B>(f: (a: A) => readonly [B, A]) => Fx<R, E, B>

export type AnyRef<A = any> =
  | Ref<any, any, A>
  | Ref<never, never, A>
  | Ref<never, any, A>
  | Ref<any, never, A>

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ResourcesOf<T> = [InstanceOf<T>] extends [Ref<infer _R, infer _E, infer _A>]
  ? _R
  : never

export type ErrorsOf<T> = [InstanceOf<T>] extends [Ref<infer _R, infer _E, infer _A>] ? _E : never

export type OutputOf<T> = [InstanceOf<T>] extends [Ref<infer _R, infer _E, infer _A>] ? _A : never
/* eslint-enable @typescript-eslint/no-unused-vars */
