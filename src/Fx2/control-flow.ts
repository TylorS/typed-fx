import { Either } from 'hkt-ts/Either'
import { pipe } from 'hkt-ts/function'

import type { Fiber } from './Fiber.js'
import { Future } from './Future.js'
import { Fx } from './Fx.js'
import {
  AttemptFrame,
  BimapFrame,
  BothFx,
  ControlFrame,
  EitherFx,
  FlatMapFrame,
  Fork,
  MapFrame,
  MapLeftFrame,
  OrElseFrame,
  SetInterruptStatus,
  Wait,
} from './Instruction.js'
import { fromExit, now } from './constructors.js'

import * as Cause from '@/Cause/index.js'
import { Exit } from '@/index.js'

export function map<A, B>(f: (a: A) => B) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R, E, B> =>
    ControlFrame.make<R, E, A, never, E, B>(fx, new MapFrame(f))
}

export function mapLeft<E, E2>(f: (e: E) => E2) {
  return <R, A>(fx: Fx<R, E, A>): Fx<R, E2, A> =>
    ControlFrame.make<R, E, A, never, E2, A>(fx, new MapLeftFrame(f))
}

export function bimap<E, E2, A, B>(f: (e: E) => E2, g: (a: A) => B) {
  return <R>(fx: Fx<R, E, A>): Fx<R, E2, B> =>
    ControlFrame.make<R, E, A, never, E2, B>(fx, new BimapFrame(f, g))
}

export function flatMap<A, R2 = never, E2 = never, B = unknown>(f: (a: A) => Fx<R2, E2, B>) {
  return <R, E>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, B> =>
    ControlFrame.make<R, E, A, R2, E | E2, B>(fx, new FlatMapFrame(f))
}

export function orElse<E, R2, E2, B>(f: (e: Cause.Cause<E>) => Fx<R2, E2, B>) {
  return <R, A>(fx: Fx<R, E, A>): Fx<R | R2, E2, A | B> =>
    ControlFrame.make<R, E, A, R2, E2, A | B>(fx, new OrElseFrame(f))
}

export function onExit<E, A, R2, E2, B>(f: (e: Exit.Exit<E, A>) => Fx<R2, E2, B>) {
  return <R>(fx: Fx<R, E, A>): Fx<R | R2, E2, B> =>
    ControlFrame.make<R, E, A, R2, E2, B>(fx, new AttemptFrame(f))
}

export function ensuring<E, A, R2, E2, B>(f: (e: Exit.Exit<E, A>) => Fx<R2, E2, B>) {
  return <R>(fx: Fx<R, E, A>): Fx<R | R2, E | E2, A> =>
    pipe(
      fx,
      onExit((exit) =>
        pipe(
          exit,
          f,
          flatMap(() => fromExit(exit)),
        ),
      ),
    )
}

export function attempt<R, E, A>(fx: Fx<R, E, A>) {
  return pipe(fx, onExit(now))
}

export function wait<R, E, A>(future: Future<R, E, A>): Fx<R, E, A> {
  return new Wait(future)
}

export function fork<R, E, A>(fx: Fx<R, E, A>): Fx<R, never, Fiber<E, A>> {
  return new Fork(fx)
}

export function uninterruptable<R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> {
  return new SetInterruptStatus(fx, false)
}

export function interruptible<R, E, A>(fx: Fx<R, E, A>): Fx<R, E, A> {
  return new SetInterruptStatus(fx, true)
}

export function both<R2, E2, B>(second: Fx<R2, E2, B>) {
  return <R, E, A>(first: Fx<R, E, A>): Fx<R | R2, E | E2, readonly [A, B]> =>
    new BothFx(first, second)
}

export function either<R2, E2, B>(second: Fx<R2, E2, B>) {
  return <R, E, A>(first: Fx<R, E, A>): Fx<R | R2, E | E2, Either<A, B>> =>
    new EitherFx(first, second)
}
