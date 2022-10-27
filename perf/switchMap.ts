import { pipe } from '@fp-ts/data/Function'
import * as M from '@most/core'
import * as rxjs from 'rxjs'

import {
  array,
  fxTest,
  iterations,
  mostStreamTest,
  runPerformanceTest,
  rxjsObservableTest,
} from './_internal.js'

import * as Stream from '@/index.js'

const nestedArray = array.map((x) => Array.from({ length: x }, (_, i) => x * 1000 + i))

const add = (x: number, y: number): number => x + y

runPerformanceTest({
  name: 'switchMap ' + iterations + ' integers',
  cases: [
    fxTest(() =>
      pipe(
        Stream.fromIterable(nestedArray),
        Stream.switchMap(Stream.fromIterable),
        Stream.scan(0, add),
      ),
    ),
    mostStreamTest(() =>
      pipe(
        M.periodic(0),
        M.withItems(nestedArray),
        M.map((ns) => pipe(M.periodic(0), M.withItems(ns))),
        M.switchLatest,
        M.scan(add, 0),
      ),
    ),
    rxjsObservableTest(() =>
      pipe(rxjs.from(nestedArray), rxjs.switchMap(rxjs.from), rxjs.scan(add, 0)),
    ),
    // Effect Stream is pull-based and does not offer switchMap
  ],
})
