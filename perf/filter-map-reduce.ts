import * as EffectStream from '@effect/core/Stream/Stream'
import { pipe } from '@fp-ts/data/Function'
import * as M from '@most/core'
import * as Chunk from '@tsplus/stdlib/collections/Chunk'
import * as rxjs from 'rxjs'

import {
  array,
  effectTsStreamTest,
  fxEffectTest,
  iterations,
  mostStreamTest,
  runPerformanceTest,
  rxjsObservableTest,
} from './_internal.js'

import * as Stream from '@/index.js'

const filterEvens = (x: number) => x % 2 === 0
const addOne = (x: number) => x + 1
const add = (x: number, y: number): number => x + y

runPerformanceTest({
  name: 'filter -> map -> scan ' + iterations + ' integers',
  cases: [
    fxEffectTest(() =>
      pipe(
        Stream.fromIterable(array),
        Stream.filter(filterEvens),
        Stream.map(addOne),
        Stream.runReduce(0, add),
      ),
    ),
    mostStreamTest(() =>
      pipe(M.periodic(0), M.withItems(array), M.filter(filterEvens), M.map(addOne), M.scan(add, 0)),
    ),
    rxjsObservableTest(() =>
      pipe(rxjs.from(array), rxjs.filter(filterEvens), rxjs.map(addOne), rxjs.scan(add, 0)),
    ),
    effectTsStreamTest(() =>
      pipe(
        EffectStream.fromChunk(Chunk.from(array)),
        EffectStream.filter(filterEvens),
        EffectStream.map(addOne),
        EffectStream.scan(0, add),
      ),
    ),
  ],
})
