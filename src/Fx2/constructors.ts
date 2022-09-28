import { pipe } from 'hkt-ts'
import { match } from 'hkt-ts/Either'

import type { Fx } from './Fx.js'
import { Fail, FromLazy, LazyFx, Now } from './Instruction.js'

import * as Cause from '@/Cause/index.js'
import * as Exit from '@/Exit/index.js'
import { FiberId } from '@/FiberId/FiberId.js'

export function now<A>(value: A): Fx.Of<A> {
  return new Now(value)
}

export function fromCause<E>(cause: Cause.Cause<E>): Fx.IO<E, never> {
  return new Fail(cause)
}

export function expected<E>(error: E): Fx.IO<E, never> {
  return fromCause(Cause.expected(error))
}

export function unexpected(error: unknown): Fx.Of<never> {
  return fromCause(Cause.unexpected(error))
}

export function interrupted(id: FiberId): Fx.Of<never> {
  return fromCause(Cause.interrupted(id))
}

export function fromExit<E, A>(exit: Exit.Exit<E, A>): Fx.IO<E, A> {
  return pipe(exit, match(fromCause, now))
}

export function fromLazy<A>(f: () => A): Fx.Of<A> {
  return new FromLazy(f)
}

export function lazy<R, E, A>(f: () => Fx<R, E, A>): Fx<R, E, A> {
  return new LazyFx(f)
}

export const unit = now<void>(undefined)
