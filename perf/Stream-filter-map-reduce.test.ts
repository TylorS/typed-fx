import * as EffectStream from '@effect/core/Stream/Stream'
import * as M from '@most/core'
import * as Chunk from '@tsplus/stdlib/collections/Chunk'
import { pipe } from 'hkt-ts'
import * as N from 'hkt-ts/number'
import * as rxjs from 'rxjs'

import {
  array,
  effectTsStreamTest,
  fxTest,
  iterations,
  mostStreamTest,
  runPerformanceTest,
  rxjsObservableTest,
} from './_internal.js'

import * as Stream from '@/Stream/index.js'

const filterEvens = (x: number) => x % 2 === 0
const addOne = (x: number) => x + 1

runPerformanceTest({
  name: 'filter -> map -> reduce ' + iterations + ' integers',
  cases: [
    fxTest(() =>
      pipe(
        Stream.fromArray(array),
        Stream.filter(filterEvens),
        Stream.map(addOne),
        Stream.foldLeft(N.IdentitySum),
      ),
    ),
    mostStreamTest(() =>
      pipe(
        M.periodic(0),
        M.withItems(array),
        M.filter(filterEvens),
        M.map(addOne),
        M.scan(N.IdentitySum.concat, 0),
      ),
    ),
    rxjsObservableTest(() =>
      pipe(
        rxjs.from(array),
        rxjs.filter(filterEvens),
        rxjs.map(addOne),
        rxjs.scan(N.IdentitySum.concat, 0),
      ),
    ),
    // Effect-ts is pull-based, while all other Streams a push-based.
    // This means this isn't really a fair test, but since there are no other
    // streams with superpowers, like Effect, its added here anyways.
    effectTsStreamTest(() =>
      pipe(
        EffectStream.fromChunk(Chunk.from(array)),
        EffectStream.filter(filterEvens),
        EffectStream.map(addOne),
        EffectStream.scan(0, N.IdentitySum.concat),
      ),
    ),
  ],
})
