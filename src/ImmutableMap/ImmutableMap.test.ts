import { deepStrictEqual } from 'assert'

import { ImmutableMap } from './ImmutableMap.js'

import { testSuite } from '@/_internal/suite.js'

testSuite(import.meta.url, () => {
  it('joinWith', () => {
    const x = ImmutableMap(new Map([[1, 1]]))
    const y = ImmutableMap(new Map([[1, 2]]))
    const z = x.joinWith(y, (a, b) => a + b)

    deepStrictEqual(Array.from(z), [[1, 3]])
  })
})
