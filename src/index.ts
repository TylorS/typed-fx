import { dualWithTrace } from "@effect/data/Debug"
import type { Duration } from "@effect/data/Duration"
import type { Cause, Effect } from "@typed/fx/externals"
import * as internal from "./data-first"

export const at: {
  (delay: Duration): <A>(value: A) => internal.Fx<never, never, A>
  <A>(value: A, delay: Duration): internal.Fx<never, never, A>
} = dualWithTrace(
  2,
  (trace) => <A>(value: A, delay: Duration): internal.Fx<never, never, A> => internal.at(value, delay).traced(trace)
)

export const catchAllCause: {
  <E, R2, E2, B>(
    f: (cause: Cause.Cause<E>) => internal.Fx<R2, E2, B>
  ): <R, A>(fx: internal.Fx<R, E, A>) => internal.Fx<R | R2, E2, A | B>
  <R, E, R2, E2, B>(
    fx: internal.Fx<R, E, B>,
    f: (cause: Cause.Cause<E>) => internal.Fx<R2, E2, B>
  ): internal.Fx<R | R2, E2, B>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, R2, E2, B>(
      fx: internal.Fx<R, E, B>,
      f: (cause: Cause.Cause<E>) => internal.Fx<R2, E2, B>
    ): internal.Fx<R | R2, E2, B> => internal.catchAllCause(fx, f).traced(trace)
)

export const catchAllCauseEffect: {
  <E, R2, E2, B>(
    f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, B>
  ): <R, A>(fx: internal.Fx<R, E, A>) => internal.Fx<R | R2, E2, A | B>
  <R, E, R2, E2, B>(
    fx: internal.Fx<R, E, B>,
    f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, B>
  ): internal.Fx<R | R2, E2, B>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, R2, E2, B>(
      fx: internal.Fx<R, E, B>,
      f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, B>
    ): internal.Fx<R | R2, E2, B> => internal.catchAllCauseEffect(fx, f).traced(trace)
)

export const catchAll: {
  <E, R2, E2, B>(
    f: (e: E) => internal.Fx<R2, E2, B>
  ): <R, A>(fx: internal.Fx<R, E, A>) => internal.Fx<R | R2, E2, A | B>

  <R, E, A, R2, E2, B>(
    fx: internal.Fx<R, E, A>,
    f: (e: E) => internal.Fx<R2, E2, B>
  ): internal.Fx<R | R2, E2, A | B>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R2, E2, B>(
      fx: internal.Fx<R, E, A>,
      f: (e: E) => internal.Fx<R2, E2, B>
    ): internal.Fx<R | R2, E2, A | B> => internal.catchAll(fx, f).traced(trace)
)

export const catchAllEffect: {
  <E, R2, E2, B>(
    f: (e: E) => Effect.Effect<R2, E2, B>
  ): <R, A>(fx: internal.Fx<R, E, A>) => internal.Fx<R | R2, E2, A | B>

  <R, E, A, R2, E2, B>(
    fx: internal.Fx<R, E, A>,
    f: (e: E) => Effect.Effect<R2, E2, B>
  ): internal.Fx<R | R2, E2, A | B>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R2, E2, B>(
      fx: internal.Fx<R, E, A>,
      f: (e: E) => Effect.Effect<R2, E2, B>
    ): internal.Fx<R | R2, E2, A | B> => internal.catchAllEffect(fx, f).traced(trace)
)

export const continueWith: {
  <R2, E2, B>(
    f: () => internal.Fx<R2, E2, B>
  ): <R, E, A>(fx: internal.Fx<R, E, A>) => internal.Fx<R | R2, E | E2, A | B>

  <R, E, A, R2, E2, B>(
    fx: internal.Fx<R, E, A>,
    f: () => internal.Fx<R2, E2, B>
  ): internal.Fx<R | R2, E | E2, A | B>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R2, E2, B>(
      fx: internal.Fx<R, E, A>,
      f: () => internal.Fx<R2, E2, B>
    ): internal.Fx<R | R2, E | E2, A | B> => internal.continueWith(fx, f).traced(trace)
)

export const continueWithEffect: {
  <R2, E2, B>(
    f: () => Effect.Effect<R2, E2, B>
  ): <R, E, A>(fx: internal.Fx<R, E, A>) => internal.Fx<R | R2, E | E2, A | B>

  <R, E, A, R2, E2, B>(
    fx: internal.Fx<R, E, A>,
    f: () => Effect.Effect<R2, E2, B>
  ): internal.Fx<R | R2, E | E2, A | B>
} = dualWithTrace(
  2,
  (trace) =>
    <R, E, A, R2, E2, B>(
      fx: internal.Fx<R, E, A>,
      f: () => Effect.Effect<R2, E2, B>
    ): internal.Fx<R | R2, E | E2, A | B> => internal.continueWithEffect(fx, f).traced(trace)
)
