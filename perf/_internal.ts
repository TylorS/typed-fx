import { performance } from 'node:perf_hooks'

import * as EffectStream from '@effect/core/Stream/Stream'
import * as Effect from '@effect/core/io/Effect'
import * as M from '@most/core'
import * as MS from '@most/scheduler'
import * as MT from '@most/types'
import benchmark, { Suite } from 'benchmark'
import * as RxJS from 'rxjs'

import * as Fx from '@/index.js'

export function parseIterations() {
  const i = parseInt(process.argv[2], 10)

  return Number.isNaN(i) ? 10000 : i
}

export const iterations = parseIterations()
export const array = Array.from({ length: iterations }, (_, i) => i)

export function runSuite(suite: Suite) {
  suite.on('start', logStart).on('cycle', logResults).on('complete', logComplete).run()
}

function logResults(e: any) {
  const t = e.target

  if (t.failure) {
    console.error(padl(10, t.name) + 'FAILED: ' + e.target.failure)
  } else {
    const result =
      padl(18, t.name) +
      padr(13, t.hz.toFixed(2) + ' op/s') +
      ' \xb1' +
      padr(7, t.stats.rme.toFixed(2) + '%') +
      padr(15, ' (' + t.stats.sample.length + ' samples)')

    console.log(result)
  }
}

function logStart(this: any) {
  console.log(this.name)
  console.log('-------------------------------------------------------')
}

function logComplete() {
  console.log('-------------------------------------------------------')
  process.exit(0)
}

function padl(n: number, s: string) {
  while (s.length < n) {
    s += ' '
  }
  return s
}

function padr(n: number, s: string) {
  while (s.length < n) {
    s = ' ' + s
  }
  return s
}

export function timeConstruction(label: string) {
  const start = performance.now()
  return () => {
    const end = performance.now()
    console.log(label, end - start)
  }
}

export interface PerformanceTest {
  readonly name: string
  readonly cases: readonly PerformanceTestCase<any>[]
}

export interface PerformanceTestCase<A> {
  name: string
  init: () => A
  run: (a: A, deferred: benchmark.Deferred) => void
}

export function PerformanceTestCase<A>(
  name: string,
  init: () => A,
  run: (a: A, deferred: benchmark.Deferred) => void,
): PerformanceTestCase<A> {
  return { name, init, run }
}

export function runPerformanceTest(test: PerformanceTest) {
  // eslint-disable-next-line import/no-named-as-default-member
  let suite = new benchmark.Suite(test.name)

  for (const testCase of test.cases) {
    const end = timeConstruction(testCase.name)
    const constructed = testCase.init()
    end()

    suite = suite.add(testCase.name, (deferred: benchmark.Deferred) =>
      testCase.run(constructed, deferred),
    )
  }

  runSuite(suite)
}

export function fxTest<E, A, E1>(init: () => Fx.Fx<never, E, A, E1>) {
  return PerformanceTestCase(
    'Fx',
    () => Fx.drainNow(init()),
    (fx, deferred) => Effect.unsafeRunAsyncWith(fx, () => deferred.resolve()),
  )
}

export function fxEffectTest<E, A>(init: () => Effect.Effect<never, E, A>) {
  return PerformanceTestCase('Fx', init, (e, deferred) => {
    Effect.unsafeRunPromise(e).then(() => deferred.resolve())
  })
}

export function mostStreamTest<A>(init: () => MT.Stream<A>) {
  const mostScheduler = MS.newDefaultScheduler()

  return PerformanceTestCase('@most/core', init, (mostStream, deferred) =>
    M.runEffects(mostStream, mostScheduler).then(() => deferred.resolve()),
  )
}

export function rxjsObservableTest<A>(init: () => RxJS.Observable<A>) {
  return PerformanceTestCase('RxJS @7', init, (observable, deferred) => {
    observable.subscribe({
      complete: () => deferred.resolve(),
    })
  })
}

export function effectTsStreamTest<E, A>(init: () => EffectStream.Stream<never, E, A>) {
  return PerformanceTestCase(
    'Effect/Stream',
    () => EffectStream.runDrain(init()),
    (e, deferred) => {
      Effect.unsafeRunPromise(e).then(() => deferred.resolve())
    },
  )
}
