import { performance } from 'node:perf_hooks'

import * as Stream from '@effect/core/stream/Stream'
import * as MC from '@most/core'
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

const array = Array.from({ length: 1000 }, (_, i) => Array.from({ length: 1000 }, (_, j) => i + j))
const sum = (a: number, b: number) => a + b

const suite: TestSuite = TestSuite(`flatMap ${array.length} * ${array.length} integers`, [
  fxTest(() => pipe(Fx.fromIterable(array), Fx.flatMap(Fx.fromIterable), Fx.scan(0, sum))),
  mostTest((fromArray) => pipe(fromArray(array), MC.chain(fromArray), MC.scan(sum, 0))),
  rxjsTest(() =>
    pipe(
      rxjs.from(array),
      rxjs.flatMap((xs) => rxjs.from(xs)),
      rxjs.scan(sum, 0),
    ),
  ),
  effectTest(() =>
    pipe(
      Stream.fromCollection(array),
      Stream.flatMap(Stream.fromCollection),
      Stream.scan(0, sum),
      Stream.runDrain,
    ),
  ),
])

export const result = await runTestSuite(
  suite,
  RunTestConfig(10, () => performance.now()),
)

if (isMain(import.meta)) {
  console.log(printTestSuiteResult(result))
}
