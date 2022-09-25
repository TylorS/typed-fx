import * as EffectStream from '@effect/core/Stream/Stream'
import * as Effect from '@effect/core/io/Effect'
import * as M from '@most/core'
import * as MS from '@most/scheduler'
import * as Chunk from '@tsplus/stdlib/collections/Chunk'
import benchmark from 'benchmark'
import { pipe } from 'hkt-ts'
import { IdentitySum } from 'hkt-ts/number'
import * as rxjs from 'rxjs'

import { runSuite, timeConstruction } from './_internal.js'

import * as Fx from '@/Fx/index.js'
import * as Stream from '@/Stream/index.js'

const filterEvens = (x: number) => x % 2 === 0
const addOne = (x: number) => x + 1
const sum = (x: number, y: number) => x + y

function parseIterations() {
  const i = parseInt(process.argv[2], 10)

  return Number.isNaN(i) ? 10000 : i
}

const iterations = parseIterations()
const array = Array.from({ length: iterations }, (_, i) => i)

const timeFx = timeConstruction('Fx')
const fxStream = pipe(
  Stream.fromArray(array),
  Stream.filter(filterEvens),
  Stream.map(addOne),
  Stream.foldLeft(IdentitySum),
)
timeFx()

const timeMost = timeConstruction('Most')
const mostStream = pipe(
  M.periodic(0),
  M.withItems(array),
  M.filter(filterEvens),
  M.map(addOne),
  M.scan(sum, 0),
)
timeMost()

const mostScheduler = MS.newDefaultScheduler()

const timeRxjs = timeConstruction('RxJS')
const rxjsStream = pipe(
  rxjs.from(array),
  rxjs.filter(filterEvens),
  rxjs.map(addOne),
  rxjs.scan(sum, 0),
)
timeRxjs()

const timeEffect = timeConstruction('Effect')
const effectStream = pipe(
  EffectStream.fromChunk(Chunk.from(array)),
  EffectStream.filter(filterEvens),
  EffectStream.map(addOne),
  EffectStream.scan(0, sum),
  EffectStream.runDrain,
)
timeEffect()

// eslint-disable-next-line import/no-named-as-default-member
const suite = new benchmark.Suite('filter -> map -> reduce ' + iterations + ' integers')

suite
  .add('@typed/fx', function (deferred: benchmark.Deferred) {
    Fx.runMain(fxStream).then(() => deferred.resolve())
  })
  .add('@most/core', function (deferred: benchmark.Deferred) {
    M.runEffects(mostStream, mostScheduler).then(() => deferred.resolve())
  })
  .add('rxjs @7', function (deferred: benchmark.Deferred) {
    rxjsStream.subscribe({
      complete: () => deferred.resolve(),
    })
  })
  .add('@effect/core', function (deferred: benchmark.Deferred) {
    Effect.unsafeRunPromise(effectStream).then(() => deferred.resolve())
  })

runSuite(suite)
