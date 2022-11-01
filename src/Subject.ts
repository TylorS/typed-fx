import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { AtomicInternal, UnsafeAPI } from '@effect/core/io/Ref/operations/_internal/AtomicInternal'
import { flow } from '@fp-ts/data/Function'
import { LazyArg, pipe } from '@tsplus/stdlib/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Fx } from './Fx.js'
import { never } from './fromEffect.js'
import { Hold } from './hold.js'
import { Multicast } from './multicast.js'

export interface Subject<E, A> extends Fx<never, E, A>, Emitter<never, E, A>, UnsafeEmitter<E, A> {}

export interface UnsafeEmitter<E, A> {
  readonly unsafeEmit: (a: A) => void
  readonly unsafeFailCause: (cause: Cause<E>) => void
  readonly unsafeEnd: () => void
}

const FX_BRANDING = {
  _R: () => void 0 as never,
  _E: () => void 0 as any,
  _A: () => void 0 as any,
}

export namespace Subject {
  export const unsafeMake = <E, A>(): Subject<E, A> => {
    const m = new Multicast<never, E, A>(never)

    return {
      ...FX_BRANDING,
      run: m.run.bind(m),
      emit: m.emit.bind(m),
      failCause: m.failCause.bind(m),
      end: m.end,
      unsafeEmit: (a) => Effect.unsafeRunAsync(m.emit(a)),
      unsafeFailCause: (c) => Effect.unsafeRunAsync(m.failCause(c)),
      unsafeEnd: () => Effect.unsafeRunAsync(m.end),
    }
  }
}

export interface HoldSubject<E, A> extends Subject<E, A>, Ref.Ref<Maybe.Maybe<A>> {}

export namespace HoldSubject {
  export const unsafeMake = <E, A>(): HoldSubject<E, A> => {
    const h = new Hold<never, E, A>(never)
    const ref: Ref.Ref<Maybe.Maybe<A>> = new AtomicInternal(new UnsafeAPI(h.value))

    return {
      ...FX_BRANDING,
      ...ref,
      run: h.run.bind(h),
      emit: h.emit.bind(h),
      failCause: h.failCause.bind(h),
      end: h.end,
      unsafeEmit: (a) => Effect.unsafeRunAsync(h.emit(a)),
      unsafeFailCause: (c) => Effect.unsafeRunAsync(h.failCause(c)),
      unsafeEnd: () => Effect.unsafeRunAsync(h.end),
    }
  }
}

export interface BehaviorSubject<E, A> extends Subject<E, A>, Ref.Ref<A> {}

export namespace BehaviorSubject {
  export const unsafeMake = <E, A>(initial: LazyArg<A>): BehaviorSubject<E, A> => {
    const h = new Hold<never, E, A>(never)
    const maybeRef: Ref.Ref<Maybe.Maybe<A>> = new AtomicInternal(new UnsafeAPI(h.value))
    const ref = invmapRef(maybeRef, Maybe.getOrElse(initial), Maybe.some)

    // Ensure there is always a value in the Ref
    h.value.set(Maybe.some(initial()))

    return {
      ...FX_BRANDING,
      ...ref,
      run: h.run.bind(h),
      emit: h.emit.bind(h),
      failCause: h.failCause.bind(h),
      end: h.end,
      unsafeEmit: (a) => Effect.unsafeRunAsync(h.emit(a)),
      unsafeFailCause: (c) => Effect.unsafeRunAsync(h.failCause(c)),
      unsafeEnd: () => Effect.unsafeRunAsync(h.end),
    }
  }
}

function invmapRef<A, B>(ref: Ref.Ref<A>, to: (a: A) => B, from: (b: B) => A): Ref.Ref<B> {
  const get: Ref.Ref<B>['get'] = pipe(ref.get, Effect.map(to))

  const modify: Ref.Ref<B>['modify'] = (f) =>
    ref.modify((a) => {
      const [b, c] = f(to(a))
      return [b, from(c)]
    })

  const set: Ref.Ref<B>['set'] = flow(from, ref.set)

  const getAndSet: Ref.Ref<B>['getAndSet'] = flow(from, ref.getAndSet, Effect.map(to))

  const getAndUpdate: Ref.Ref<B>['getAndUpdate'] = (f) =>
    pipe(ref.getAndUpdate(flow(to, f, from)), Effect.map(to))

  const getAndUpdateSome: Ref.Ref<B>['getAndUpdateSome'] = (f) =>
    pipe(ref.getAndUpdateSome(flow(to, f, Maybe.map(from))), Effect.map(to))

  const modifySome: Ref.Ref<B>['modifySome'] = (fallback, f) =>
    ref.modifySome(fallback, (a) =>
      pipe(
        a,
        to,
        f,
        Maybe.map(([c, b]) => [c, from(b)]),
      ),
    )

  const update: Ref.Ref<B>['update'] = (f) => ref.update(flow(to, f, from))

  const updateAndGet: Ref.Ref<B>['updateAndGet'] = (f) =>
    pipe(ref.updateAndGet(flow(to, f, from)), Effect.map(to))

  const updateSome: Ref.Ref<B>['updateSome'] = (f) => ref.updateSome(flow(to, f, Maybe.map(from)))

  const updateSomeAndGet: Ref.Ref<B>['updateSomeAndGet'] = (f) =>
    pipe(ref.updateSomeAndGet(flow(to, f, Maybe.map(from))), Effect.map(to))

  return {
    [Ref.RefSym]: Ref.RefSym,
    [Ref._A]: (_) => _,
    get,
    modify,
    set,
    getAndSet,
    getAndUpdate,
    getAndUpdateSome,
    modifySome,
    update,
    updateAndGet,
    updateSome,
    updateSomeAndGet,
  }
}
