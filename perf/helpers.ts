import * as url from 'node:url'

import * as Effect from '@effect/core/io/Effect'
import * as MC from '@most/core'
import * as MS from '@most/scheduler'
import { asap } from '@most/scheduler'
import * as MT from '@most/types'
import * as rxjs from 'rxjs'

import * as Fx from '../src/index'
import { PerformanceTestCase } from '../tools/benchmark.js'

export function effectTest<E, A>(init: () => Effect.Effect<never, E, A>) {
  return PerformanceTestCase('effect/Stream', init, Effect.unsafeRunPromise)
}

export function rxjsTest<A>(init: () => rxjs.Observable<A>) {
  return PerformanceTestCase('rxjs @7', init, (o) => new Promise((resolve) => o.subscribe(resolve)))
}

export function mostTest<A>(init: (fromArray: typeof mostFromArray) => MT.Stream<A>) {
  const scheduler = MS.newDefaultScheduler()

  return PerformanceTestCase(
    '@most/core',
    () => init(mostFromArray),
    (o) => MC.runEffects(o, scheduler),
  )
}

export function mostFromArray<A>(array: readonly A[]): MT.Stream<A> {
  const l = array.length
  return MC.newStream((sink, scheduler) =>
    asap(
      {
        run(t) {
          for (let i = 0; i < l; ++i) {
            sink.event(t, array[i])
          }
          sink.end(t)
        },
        error(t, e) {
          sink.error(t, e)
        },
        dispose() {
          // Nothing to dispose
        },
      },
      scheduler,
    ),
  )
}

export function fxTest<E, A>(init: () => Fx.Fx<never, E, A>) {
  return PerformanceTestCase('@typed/fx', () => Fx.runDrain(init()), Effect.unsafeRunPromise)
}

export function isMain(meta: ImportMeta) {
  return meta.url.startsWith('file:') && process.argv[1] === url.fileURLToPath(meta.url)
}
