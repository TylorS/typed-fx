import { deepStrictEqual } from 'assert'

import { pipe } from 'hkt-ts'

import { observe } from './drain.js'
import { fromFx } from './fromFx.js'

import { runTest } from '@/Fx/Fx.test.js'
import * as Fx from '@/Fx/index.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'

describe(new URL(import.meta.url).pathname, () => {
  describe(fromFx.name, () => {
    const value = Math.random()

    it('should create a Stream', () =>
      pipe(
        Fx.success(value),
        fromFx,
        observe((n) => Fx.fromLazy(() => deepStrictEqual(n, value))),
        Fx.flatMap(Fx.join),
        Fx.provide(RootScheduler()),
        runTest,
      ))
  })
})
