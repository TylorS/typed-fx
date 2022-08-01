import 'source-map-support/register'
import { ok } from 'assert'

import { isLeft } from 'hkt-ts/Either'

import { prettyPrint } from '@/Cause/Renderer.js'
import { Env } from '@/Fx/Sync/Env.js'
import { Sync, ask, fail } from '@/Fx/Sync/Sync.js'
import { runWith } from '@/Fx/Sync/run.js'
import { Service } from '@/Service/index.js'

const Foo = Service<number>('Foo')

const program = Sync(function* () {
  const a = yield* ask<number>(Foo, 'custom-trace')
  const b = yield* ask<number>(Foo)

  if (a > 5) {
    return yield* fail(new Error('foo'))
  }

  return a + b
})

const failing = runWith(program, Env(Foo, 7))

ok(isLeft(failing))
console.log(prettyPrint(failing.left))
