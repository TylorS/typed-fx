import { annotate, log, span } from '@/Fx/logging.js'
import { runMain } from '@/Fx/run.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  it('allows logging to the console', async () => {
    const test = span('foo')(annotate('bar', 'baz')(log('test')))

    await runMain(test)
  })
})
