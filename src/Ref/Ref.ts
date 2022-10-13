import { flow, pipe } from 'hkt-ts'
import * as Maybe from 'hkt-ts/Maybe'

import * as FiberRef from '@/FiberRef/index.js'
import * as Fx from '@/Fx/index.js'

export interface Ref<R, E, I, O = I> {
  readonly get: Fx.Fx<R, E, O>
  readonly set: (i: I) => Fx.Fx<R, E, O>
  readonly delete: Fx.Fx<R, E, Maybe.Maybe<O>>
}

export function fromFiberRef<R, E, A>(fiberRef: FiberRef.FiberRef<R, E, A>): Ref<R, E, A, A> {
  return {
    get: FiberRef.get(fiberRef),
    set: (i) => FiberRef.set(i)(fiberRef),
    delete: FiberRef.delete(fiberRef),
  }
}

export const make = flow(FiberRef.make, fromFiberRef)

export function map<A, B>(f: (a: A) => B) {
  return <R, E, I>(ref: Ref<R, E, I, A>): Ref<R, E, I, B> => ({
    get: pipe(ref.get, Fx.map(f)),
    set: flow(ref.set, Fx.map(f)),
    delete: pipe(ref.delete, Fx.map(Maybe.map(f))),
  })
}

export function mapFx<A, R2, E2, B>(f: (a: A) => Fx.Fx<R2, E2, B>) {
  return <R, E, I>(ref: Ref<R, E, I, A>): Ref<R | R2, E | E2, I, B> => ({
    get: pipe(ref.get, Fx.flatMap(f)),
    set: flow(ref.set, Fx.flatMap(f)),
    delete: pipe(
      ref.delete,
      Fx.flatMap(
        Maybe.match(() => Fx.now<Maybe.Maybe<B>>(Maybe.Nothing), flow(f, Fx.map(Maybe.Just))),
      ),
    ),
  })
}

export function local<A, B>(f: (a: A) => B) {
  return <R, E, C>(ref: Ref<R, E, B, C>): Ref<R, E, A, C> => ({
    get: ref.get,
    set: flow(f, ref.set),
    delete: ref.delete,
  })
}

export function localFx<A, R2, E2, B>(f: (a: A) => Fx.Fx<R2, E2, B>) {
  return <R, E, C>(ref: Ref<R, E, B, C>): Ref<R | R2, E | E2, A, C> => ({
    get: ref.get,
    set: flow(f, Fx.flatMap(ref.set)),
    delete: ref.delete,
  })
}
