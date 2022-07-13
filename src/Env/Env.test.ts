import { deepStrictEqual } from 'assert'

import { makeCircularDependenciesMessage } from './Env'

import { ServiceId } from '@/ServiceId/index'

describe(__filename, () => {
  describe(makeCircularDependenciesMessage.name, () => {
    it('formats an error message for circular dependencies', () => {
      const circularDependencies = [
        [ServiceId('A'), ServiceId('B'), ServiceId('C')],
        [ServiceId('D'), ServiceId('E')],
      ] as const

      const message = makeCircularDependenciesMessage(circularDependencies)

      const expected = `Circular dependency amongst Layers:
  A -> B -> C -> A
  D -> E -> D
`

      deepStrictEqual(message, expected)
    })
  })
})
