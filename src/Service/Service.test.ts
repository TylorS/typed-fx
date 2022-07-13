import { deepStrictEqual, ok } from 'assert'

import { Service } from './Service'

describe(__filename, () => {
  describe(Service.name, () => {
    it('creates a class branded with the service output', () => {
      class MyService extends Service {}

      // Should have same name as constructor at instance time
      deepStrictEqual(MyService.name, 'MyService')
      deepStrictEqual(new MyService().name, 'MyService')

      ok(
        MyService.id() !== class OtherService extends Service {}.id(),
        'Should Generate Separate Ids',
      )
    })
  })
})
