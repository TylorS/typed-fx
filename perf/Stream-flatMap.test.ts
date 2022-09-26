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

const nestedArray = array.map((x) => Array.from({ length: x }, (_, i) => x * 1000 + i))

runPerformanceTest({
  name: 'flatMap ' + iterations + ' integers',
  cases: [
    fxTest(() =>
      pipe(
        Stream.fromArray(nestedArray),
        Stream.flatMap(Stream.fromArray),
        Stream.foldLeft(N.IdentitySum),
      ),
    ),
    mostStreamTest(() =>
      pipe(
        M.periodic(0),
        M.withItems(nestedArray),
        M.chain((ns) => pipe(M.periodic(0), M.withItems(ns))),
        M.scan(N.IdentitySum.concat, 0),
      ),
    ),
    rxjsObservableTest(() =>
      pipe(rxjs.from(nestedArray), rxjs.flatMap(rxjs.from), rxjs.scan(N.IdentitySum.concat, 0)),
    ),
    // Effect-ts is pull-based, while all other Streams a push-based.
    // This means this isn't really a fair test, but since there are no other
    // streams with superpowers, like Effect, its added here anyways.
    effectTsStreamTest(() =>
      pipe(
        EffectStream.fromChunk(Chunk.from(nestedArray)),
        EffectStream.flatMap((ns) => EffectStream.fromChunk(Chunk.from(ns))),
        EffectStream.scan(0, N.IdentitySum.concat),
      ),
    ),
  ],
})
