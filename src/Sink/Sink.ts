import * as Maybe from 'hkt-ts/Maybe'
import { Predicate } from 'hkt-ts/Predicate'
import { Identity } from 'hkt-ts/Typeclass/Identity'
import { flow, pipe } from 'hkt-ts/function'

import { Cause } from '@/Cause/Cause.js'
import { FiberRef } from '@/FiberRef/FiberRef.js'
import * as Fx from '@/Fx/index.js'

export interface Sink<E, A, R2, E2, B> {
  readonly event: (a: A) => Fx.Fx<R2, E2, unknown>
  readonly error: (cause: Cause<E>) => Fx.Fx<R2, E2, B>
  readonly end: Fx.Fx<R2, E2, B>
}

export class Drain<E, A, R2, E2, B> implements Sink<E, A, R2, E | E2, B> {
  constructor(readonly end: Sink<E, A, R2, E | E2, B>['end']) {}

  readonly event: Sink<E, A, R2, E | E2, B>['event'] = () => Fx.unit
  readonly error: Sink<E, A, R2, E | E2, B>['error'] = Fx.fromCause
}

export class Filter<E, A, R2, E2, B> implements Sink<E, A, R2, E2, B> {
  constructor(readonly sink: Sink<E, A, R2, E2, B>, readonly predicate: Predicate<A>) {}

  readonly event: Sink<E, A, R2, E2, B>['event'] = (a) =>
    this.predicate(a) ? this.sink.event(a) : Fx.unit
  readonly error = this.sink.error
  readonly end = this.sink.end

  static make<E, A, R2, E2, B>(
    sink: Sink<E, A, R2, E2, B>,
    predicate: Predicate<A>,
  ): Sink<E, A, R2, E2, B> {
    if (sink instanceof Filter) {
      return Filter.make(sink.sink, (a) => sink.predicate(a) && predicate(a))
    }

    return new Filter(sink, predicate)
  }
}

export class Map<E, A, R2, E2, B, C> implements Sink<E, A, R2, E2, B> {
  constructor(readonly sink: Sink<E, C, R2, E2, B>, readonly f: (a: A) => C) {}

  readonly event: Sink<E, A, R2, E2, B>['event'] = flow(this.f, this.sink.event)
  readonly error = this.sink.error
  readonly end = this.sink.end

  static make<E, A, R2, E2, B, C>(
    sink: Sink<E, C, R2, E2, B>,
    f: (a: A) => C,
  ): Sink<E, A, R2, E2, B> {
    if (sink instanceof Map) {
      return Map.make(sink, flow(sink.f, f))
    }

    if (sink instanceof Filter) {
      return FilterMap.make(sink.sink, flow(Maybe.fromPredicate(sink.predicate), Maybe.map(f)))
    }

    return new Map(sink, f)
  }
}

export class FilterMap<E, A, R2, E2, B, C> implements Sink<E, A, R2, E2, B> {
  constructor(readonly sink: Sink<E, C, R2, E2, B>, readonly f: (a: A) => Maybe.Maybe<C>) {}

  readonly event: Sink<E, A, R2, E2, B>['event'] = flow(
    this.f,
    Maybe.match(() => Fx.unit, this.sink.event),
  )
  readonly error = this.sink.error
  readonly end = this.sink.end

  static make<E, A, R2, E2, B, C>(
    sink: Sink<E, C, R2, E2, B>,
    f: (a: A) => Maybe.Maybe<C>,
  ): Sink<E, A, R2, E2, B> {
    if (sink instanceof Map) {
      return FilterMap.make(sink.sink, flow(sink.f, f))
    }

    if (sink instanceof Filter) {
      return FilterMap.make(sink.sink, flow(Maybe.fromPredicate(sink.predicate), Maybe.map(f)))
    }

    if (sink instanceof FilterMap) {
      return FilterMap.make(sink.sink, flow(sink.f, Maybe.flatMap(f)))
    }

    return new FilterMap(sink, f)
  }
}

export class Scan<E, A, R2, E2, B, C> implements Sink<E, A, R2, E2, B> {
  protected current = this.seed

  constructor(
    readonly sink: Sink<E, C, R2, E2, B>,
    readonly seed: C,
    readonly f: (c: C, a: A) => C,
  ) {}

  readonly event = (a: A) =>
    Fx.lazy(() => {
      const { current, f } = this

      return this.sink.event((this.current = f(current, a)))
    })

  readonly error = this.sink.error
  readonly end = this.sink.end

  static make<E, A, R2, E2, B, C>(
    sink: Sink<E, C, R2, E2, B>,
    seed: C,
    f: (c: C, a: A) => C,
  ): Sink<E, A, R2, E2, B> {
    // TODO: Fusion with Filter + Map

    return new Scan(sink, seed, f)
  }
}

export class FilterMapScan<E, A, R2, E2, B> extends Drain<E, A, R2, E, B> {
  protected current = this.seed

  constructor(
    readonly sink: Sink<E, B, R2, E2, B>,
    readonly seed: B,
    readonly f: (b: B, a: A) => Maybe.Maybe<B>,
  ) {
    super(Fx.fromLazy(() => this.current))
  }

  readonly event = (a: A) =>
    Fx.fromLazy(() => {
      const { current, f } = this
      const maybe = f(current, a)

      if (Maybe.isJust(maybe)) {
        this.current = maybe.value
      }
    })
}

export class Observe<E, A, R2, E2> implements Sink<E, A, R2, E | E2, void> {
  constructor(readonly event: Sink<E, A, R2, E | E2, void>['event']) {}

  readonly error: Sink<E, A, R2, E | E2, void>['error'] = Fx.fromCause
  readonly end: Sink<E, A, R2, E | E2, void>['end'] = Fx.unit
}

export class IntoFiberRef<E, A, R2, E2> implements Sink<E, A, R2, E | E2, A> {
  constructor(readonly fiberRef: FiberRef<R2, E2, A>) {}

  readonly event: Sink<E, A, R2, E | E2, A>['event'] = Fx.set_(this.fiberRef)
  readonly error: Sink<E, A, R2, E | E2, A>['error'] = Fx.fromCause
  readonly end = Fx.get(this.fiberRef)
}

export class FoldMap<E, A, B> extends Drain<E, A, never, never, B> {
  protected current = this.I.id

  constructor(readonly f: (a: A) => Maybe.Maybe<B>, readonly I: Identity<B>) {
    super(Fx.fromLazy(() => this.current))
  }

  readonly event = (a: A) =>
    Fx.fromLazy(() =>
      pipe(
        a,
        this.f,
        Maybe.match(
          () => Fx.unit,
          (b) => (this.current = this.I.concat(this.current, b)),
        ),
      ),
    )
}
