import { DeepEquals, Eq } from 'hkt-ts/Typeclass/Eq'

import * as Fx from '../Fx/index.js'

import { Id } from '@/Service/index.js'

export interface RefApi<R, E, A> {
  readonly get: Fx.Fx<R, E, A>
  readonly modify: <B>(f: (a: A) => readonly [B, A]) => Fx.Fx<R, E, B>
}

export type Ref<R, E, A> = ReturnType<typeof Ref<R, E, A>>

export function Ref<R, E, A>(initial: Fx.Fx<R, E, A>, Eq: Eq<A> = DeepEquals) {
  return class Reference extends Id implements RefApi<R, E, A> {
    static initial = initial
    static Eq = Eq

    constructor(readonly get: RefApi<R, E, A>['get'], readonly modify: RefApi<R, E, A>['modify']) {
      super()
    }

    static get<S extends typeof Reference>(this: S) {
      return Fx.asksFx_(this.id())((ref) => ref.get)
    }

    static modify<S extends typeof Reference, B>(this: S, f: (a: A) => readonly [B, A]) {
      return Fx.asksFx_(this.id())((ref) => ref.modify(f))
    }
  }
}
