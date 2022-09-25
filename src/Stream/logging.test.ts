import { flow, pipe } from 'hkt-ts'

import { continueWith } from './continueWith.js'
import { flatMap } from './flatMap.js'
import { now } from './fromFx.js'
import { runMain } from './run.js'
import { tap } from './tap.js'

import * as Fx from '@/Fx/index.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  describe('Logging Streams', () => {
    it('should log the stream', async () => {
      const stream = pipe(
        now(1, 'now1'),
        continueWith(() => now(2, 'now2'), 'continueWith'),
        flatMap((n) => now(n + 1, 'now+1'), 'flatMap'),
        tap(
          flow((n) => String(n), Fx.log),
          'tap',
        ),
      )

      await runMain(stream)
    })
  })
})
