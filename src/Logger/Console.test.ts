import { addCustomTrace } from '@/Fx/index.js'
import { annotate, logTrace, span } from '@/Fx/logging.js'
import { runMain } from '@/Fx/run.js'
import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  it('allows logging to the console', async () => {
    const test = addCustomTrace('outer')(
      span('foo')(annotate('bar', 'baz')(addCustomTrace('inner')(logTrace('test')))),
    )

    await runMain(test)
  })
})
