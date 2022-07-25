import 'source-map-support/register'
import { ok } from 'assert'

import { isLeft } from 'hkt-ts/Either'

import { prettyPrint } from '@/Fx/Cause/Renderer'
import { Sync, ask, fail } from '@/Fx/Sync/Sync'
import { runWith } from '@/Fx/Sync/run'

const program = Sync(function* () {
  const a = yield* ask<number>('custom-trace')
  const b = yield* ask<number>()

  if (a > 5) {
    return yield* fail(new Error('foo'))
  }

  return a + b
})

const failing = runWith(program, 7)

ok(isLeft(failing))
console.log(prettyPrint(failing.left))
