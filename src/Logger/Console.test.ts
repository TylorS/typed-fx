import { runTest } from '@/Fx/Fx.test.js'
import { annotate, log, span } from '@/Fx/logging.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  it('allows logging to the console', async () => {
    const test = span('foo')(annotate('bar', 'baz')(log('test')))

    await runTest(test)
  })
})
