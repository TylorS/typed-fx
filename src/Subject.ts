import { Cause } from '@effect/core/io/Cause'
import * as Effect from '@effect/core/io/Effect'
import * as Ref from '@effect/core/io/Ref'
import { AtomicInternal, UnsafeAPI } from '@effect/core/io/Ref/operations/_internal/AtomicInternal'
import { SynchronizedInternal } from '@effect/core/io/Ref/operations/_internal/SynchronizedInternal'
import * as TSemaphore from '@effect/core/stm/TSemaphore'
import { flow } from '@fp-ts/data/Function'
import { LazyArg, pipe } from '@tsplus/stdlib/data/Function'
import * as Maybe from '@tsplus/stdlib/data/Maybe'

import { Emitter, Fx } from './Fx.js'
import { never } from './fromEffect.js'
import { Hold } from './hold.js'
import { Multicast } from './multicast.js'

export function makeSubject<E, A>(): Effect.Effect<never, never, Subject<E, A>> {
  return Effect.sync(() => Subject.unsafeMake<E, A>())
}

export function makeHoldSubject<E, A>(): Effect.Effect<never, never, HoldSubject<E, A>> {
  return Effect.sync(() => HoldSubject.unsafeMake<E, A>())
}

export function makeRefSubject<A, E = never>(
  initial: LazyArg<A>,
): Effect.Effect<never, never, RefSubject<E, A>> {
  return Effect.sync(() => RefSubject.unsafeMake<A, E>(initial))
}

export function makeSynchronizedSubject<A, E = never>(
  initial: LazyArg<A>,
): Effect.Effect<never, never, SynchronizedSubject<E, A>> {
  return Effect.sync(() => SynchronizedSubject.unsafeMake<A, E>(initial))
}

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

export interface HoldSubject<E, A> extends Subject<E, A> {
  readonly get: Effect.Effect<never, never, Maybe.Maybe<A>>
}

export namespace HoldSubject {
  export const unsafeMake = <E, A>(): HoldSubject<E, A> => {
    const h = new Hold<never, E, A>(never)

    return {
      ...FX_BRANDING,
      get: Effect.sync(() => h.value.get),
      run: (e) => h.run(e),
      emit: (a) => h.emit(a),
      failCause: (e) => h.failCause(e),
      end: h.end,
      unsafeEmit: (a) => Effect.unsafeRunAsync(h.emit(a)),
      unsafeFailCause: (c) => Effect.unsafeRunAsync(h.failCause(c)),
      unsafeEnd: () => Effect.unsafeRunAsync(h.end),
    }
  }
}

export interface RefSubject<E, A> extends Subject<E, A>, Ref.Ref<A> {}

export namespace RefSubject {
  export const unsafeMake = <A, E = never>(initial: LazyArg<A>): RefSubject<E, A> => {
    const h = new Hold<never, E, A>(never)
    const maybeRef: Ref.Ref<Maybe.Maybe<A>> = new AtomicInternal(new UnsafeAPI(h.value))
    const ref = emitRefChanges(invmapRef(maybeRef, Maybe.getOrElse(initial), Maybe.some), h)

    // Ensure there is always a value in the Ref
    h.value.set(Maybe.some(initial()))

    return {
      ...FX_BRANDING,
      [Ref.RefSym]: Ref.RefSym,
      [Ref._A]: (_) => _,
      get: ref.get,
      modify: (f) => ref.modify(f),
      set: (a) => ref.set(a),
      getAndSet: (a) => ref.getAndSet(a),
      getAndUpdate: (f) => ref.getAndUpdate(f),
      getAndUpdateSome: (f) => ref.getAndUpdateSome(f),
      modifySome: (fallback, f) => ref.modifySome(fallback, f),
      update: (f) => ref.update(f),
      updateAndGet: (f) => ref.updateAndGet(f),
      updateSome: (f) => ref.updateSome(f),
      updateSomeAndGet: (f) => ref.updateSomeAndGet(f),
      run: h.run.bind(h),
      emit: ref.set,
      failCause: h.failCause.bind(h),
      end: h.end,
      unsafeEmit: (a) => Effect.unsafeRunAsync(ref.set(a)),
      unsafeFailCause: (c) => Effect.unsafeRunAsync(h.failCause(c)),
      unsafeEnd: () => Effect.unsafeRunAsync(h.end),
    }
  }
}

export interface SynchronizedSubject<E, A> extends RefSubject<E, A>, Ref.Ref.Synchronized<A> {}

export namespace SynchronizedSubject {
  export const unsafeMake = <A, E = never>(initial: LazyArg<A>): SynchronizedSubject<E, A> => {
    const subject = RefSubject.unsafeMake<A, E>(initial)
    const synchronizedRef = new SynchronizedInternal(subject, TSemaphore.unsafeMake(1))

    return {
      ...subject,
      [Ref.SynchronizedSym]: Ref.SynchronizedSym,
      modifyEffect: (f) => synchronizedRef.modifyEffect(f),
      modifySomeEffect: (fallback, f) => synchronizedRef.modifySomeEffect(fallback, f),
      getAndUpdateEffect: (f) => synchronizedRef.getAndUpdateEffect(f),
      getAndUpdateSomeEffect: (f) => synchronizedRef.getAndUpdateSomeEffect(f),
      updateEffect: (f) => synchronizedRef.updateEffect(f),
      updateAndGetEffect: (f) => synchronizedRef.updateAndGetEffect(f),
      updateSomeEffect: (f) => synchronizedRef.updateSomeEffect(f),
      updateSomeAndGetEffect: (f) => synchronizedRef.updateSomeAndGetEffect(f),
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

function emitRefChanges<A, E>(ref: Ref.Ref<A>, subject: Emitter<never, E, A>): Ref.Ref<A> {
  const andEmitLatestValue = Effect.zipLeft(pipe(ref.get, Effect.flatMap(subject.emit)))

  return {
    [Ref.RefSym]: Ref.RefSym,
    [Ref._A]: (_) => _,
    get: ref.get,
    modify: (f) => pipe(ref.modify(f), andEmitLatestValue),
    set: (a) =>
      pipe(
        ref.update(() => a),
        Effect.zipLeft(subject.emit(a)),
      ),
    getAndSet: (a) =>
      pipe(
        ref.getAndUpdate(() => a),
        Effect.zipLeft(subject.emit(a)),
      ),
    getAndUpdate: (f) => pipe(ref.getAndUpdate(f), andEmitLatestValue),
    getAndUpdateSome: (f) => pipe(ref.getAndUpdateSome(f), andEmitLatestValue),
    modifySome: (fallback, f) => pipe(ref.modifySome(fallback, f), andEmitLatestValue),
    update: (f) => pipe(ref.update(f), andEmitLatestValue),
    updateAndGet: (f) => pipe(ref.updateAndGet(f), andEmitLatestValue),
    updateSome: (f) => pipe(ref.updateSome(f), andEmitLatestValue),
    updateSomeAndGet: (f) => pipe(ref.updateSomeAndGet(f), andEmitLatestValue),
  }
}
