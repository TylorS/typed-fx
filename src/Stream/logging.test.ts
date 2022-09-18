import { flow, pipe } from 'hkt-ts'

import { continueWith } from './continueWith.js'
import { now } from './fromFx.js'
import { runMain } from './run.js'
import { tap } from './tap.js'

import * as Fx from '@/Fx/index.js'
import { RootScheduler } from '@/Scheduler/RootScheduler.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe('Logging Streams', () => {
    it('should log the stream', async () => {
      const stream = pipe(
        now(1),
        continueWith(() => now(2)),
        tap(flow(String, Fx.log)),
      )

      await runMain(RootScheduler())(stream)
    })
  })
})
