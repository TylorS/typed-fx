import process from 'node:process'

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

export function runSuite(suite: Suite, cb: () => void) {
  suite
    .on('start', logStart)
    .on('cycle', logResults)
    .on('complete', () => {
      logComplete()
      cb()
    })
    .run({ defer: false })
}

const longestLibrary = 13
const longestOps = 10

function logResults(e: any) {
  const t = e.target

  if (t.failure) {
    console.log(`| ${t.name} | FAILED | ${e.target.failure} |`)

    console.error(padl(10, t.name) + 'FAILED: ' + e.target.failure)
  } else {
    console.log(
      `| ${padl(longestLibrary, t.name)} | ${padl(longestOps, t.hz.toFixed(2))} | ${padl(
        6,
        t.stats.rme.toFixed(2) + '%',
      )} | ${padl(3, t.stats.sample.length)}      |`,
    )
  }
}

function logStart(this: any) {
  console.log('### ' + this.name)
  console.log(`| Library       | Ops/sec    | ±      | Samples |
| --------------|------------|--------|---------|`)
}

function logComplete() {
  console.log('-------------------------------------------------------\n')
}

function padl(n: number, s: string) {
  while (s.length < n) {
    s += ' '
  }
  return s
}

// function padr(n: number, s: string) {
//   while (s.length < n) {
//     s = ' ' + s
//   }
//   return s
// }

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

export function runPerformanceTest(test: PerformanceTest, cb: () => void) {
  // eslint-disable-next-line import/no-named-as-default-member
  let suite = new benchmark.Suite(test.name)

  for (const testCase of test.cases) {
    const constructed = testCase.init()

    suite = suite.add(testCase.name, (deferred: benchmark.Deferred) =>
      testCase.run(constructed, deferred),
    )
  }

  runSuite(suite, cb)
}

export function fxTest<E, A>(init: () => Fx.Fx<never, E, A>) {
  return PerformanceTestCase(
    'Fx',
    () => {
      const push = init()

      return Fx.runDrain(push)
    },
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
