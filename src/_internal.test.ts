import * as TestClock_ from '@effect/io/internal/testing/testClock'
import * as TestEnvironment_ from '@effect/io/internal/testing/testEnvironment'
import { Duration, Effect, Layer } from 'effect'

export function adjust(
  duration: Duration.Duration,
): Effect.Effect<TestEnvironment_.TestEnvironment, never, void> {
  return TestClock_.adjust(duration as any) as any
}

export const TestEnvironment: Layer.Layer<never, never, TestEnvironment_.TestEnvironment> =
  TestEnvironment_.TestEnvironment as any
