import { runTest } from '@/Fx/Fx.test.js'
import { log, span } from '@/Fx/logging.js'

describe(new URL(import.meta.url).pathname, () => {
  it('allows logging to the console', async () => {
    const test = span('foo')(log('test'))

    await runTest(test)
  })
})
