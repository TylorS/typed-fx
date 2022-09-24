import * as M from '@most/core'
import * as MS from '@most/scheduler'
import benchmark from 'benchmark'
import { pipe } from 'hkt-ts'
import * as rxjs from 'rxjs'

import * as Fx from '@/Fx/index.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { Scheduler } from '@/Scheduler/Scheduler.js'
import * as Stream from '@/Stream/index.js'

const filterEvens = (x: number) => x % 2 === 0
const addOne = (x: number) => x + 1
const sum = (x: number, y: number) => x + y

const iterations = 1000000
const array = Array.from({ length: iterations }, (_, i) => i)

const fxStream = pipe(
  Stream.fromArray(array),
  Stream.filter(filterEvens),
  Stream.map(addOne),
  Stream.reduce(sum, 0),
  Fx.provideService(Scheduler, RootScheduler()),
)

const mostStream = pipe(
  M.periodic(0),
  M.withItems(array),
  M.filter(filterEvens),
  M.map(addOne),
  M.scan(sum, 0),
)

const mostScheduler = MS.newDefaultScheduler()

const rxjsStream = pipe(
  rxjs.from(array),
  rxjs.filter(filterEvens),
  rxjs.map(addOne),
  rxjs.scan(sum, 0),
)

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
  .on('start', logStart)
  .on('cycle', logResults)
  .on('complete', logComplete)
  .run()

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
