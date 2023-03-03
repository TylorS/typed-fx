import type { Effect } from "@effect/io/Effect"

export interface Fx<out Services, out Errors, out Output> {
  readonly run: <Services2>(services: Sink<Services2, Errors, Output>) => Effect<Services | Services2, Errors, Output>
}

export function Fx<Services, Errors, Output>(
  run: Fx<Services, Errors, Output>["run"]
): Fx<Services, Errors, Output> {
  return { run }
}

export interface Sink<out Services, in Errors, in Output> {
  readonly event: (event: Output) => Effect<Services, never, unknown>
  readonly error: (error: Errors) => Effect<Services, never, unknown>
  readonly end: Effect<Services, never, unknown>
}

export function Sink<Services1, Services2, Services3, Errors, Output>(
  event: Sink<Services1, Errors, Output>["event"],
  error: Sink<Services2, Errors, Output>["error"],
  end: Sink<Services3, Errors, Output>["end"]
): Sink<Services1 | Services2 | Services3, Errors, Output> {
  return { event, error, end }
}
