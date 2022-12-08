import { performance } from 'node:perf_hooks'

import { pipe } from '@fp-ts/data/Function'
import * as MC from '@most/core'
import * as rxjs from 'rxjs'

import * as Fx from '../../src/index'
import {
  RunTestConfig,
  TestSuite,
  printTestSuiteResult,
  runTestSuite,
} from '../../tools/benchmark.js'
import { fxTest, mostTest, rxjsTest } from '../helpers.js'

const config: RunTestConfig = RunTestConfig(100, () => performance.now())
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
])

runTestSuite(suite, config).then(
  (result) => console.log(printTestSuiteResult(result)),
  (error) => {
    console.error(error)
    process.exitCode = 1
  },
)
