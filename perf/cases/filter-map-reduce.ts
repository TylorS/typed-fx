import { performance } from 'node:perf_hooks'

import * as Stream from '@effect/core/stream/Stream'
import * as MC from '@most/core'
import * as Chunk from '@tsplus/stdlib/collections/Chunk'
import { pipe } from '@tsplus/stdlib/data/Function'
import * as rxjs from 'rxjs'

import * as Fx from '../../src/index'
import {
  RunTestConfig,
  TestSuite,
  printTestSuiteResult,
  runTestSuite,
} from '../../tools/benchmark.js'
import { effectTest, fxTest, isMain, mostTest, rxjsTest } from '../helpers.js'

const array = Array.from({ length: 100_000 }, (_, i) => i)
const filterEven = (n: number) => n % 2 === 0
const double = (n: number) => n * 2
const sum = (a: number, b: number) => a + b

const suite: TestSuite = TestSuite(`filter -> map -> reduce ${array.length} integers`, [
  fxTest(() =>
    pipe(Fx.fromIterable(array), Fx.filter(filterEven), Fx.map(double), Fx.scan(0, sum)),
  ),
  mostTest((fromArray) =>
    pipe(fromArray(array), MC.filter(filterEven), MC.map(double), MC.scan(sum, 0)),
  ),
  rxjsTest(() =>
    pipe(rxjs.from(array), rxjs.filter(filterEven), rxjs.map(double), rxjs.scan(sum, 0)),
  ),
  effectTest(() =>
    pipe(
      Stream.fromChunk(Chunk.from(array)),
      Stream.filter(filterEven),
      Stream.map(double),
      Stream.scan(0, sum),
      Stream.runDrain,
    ),
  ),
])

export const result = await runTestSuite(
  suite,
  RunTestConfig(100, () => performance.now()),
)

if (isMain(import.meta)) {
  console.log(printTestSuiteResult(result))
}
