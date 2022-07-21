import { pipe } from 'hkt-ts'
import { Right, isRight } from 'hkt-ts/Either'

import { GetCurrentFiberContext, GetEnvironment, Resume, Suspend } from '../RuntimeInstruction'
import { RuntimeIterable } from '../RuntimeIterable'

import { Env } from '@/Env/Env'
import { FiberContext } from '@/FiberContext/index'
import { Fx } from '@/Fx/Fx'
import { Async } from '@/Fx/InstructionSet/Async'
import { provide } from '@/Fx/index'

export function* processAsync<R, E, A>(
  instr: Async<R, E, A>,
  toRuntimeIterable: <A>(fx: Fx<R, E, A>) => RuntimeIterable<E, A>,
) {
  const env: Env<R> = yield new GetEnvironment()
  const context: FiberContext = yield new GetCurrentFiberContext()
  const [id, cb]: [symbol, (fx: Fx<R, E, any>) => void] = yield new Suspend()
  const either = instr.input(cb)

  if (isRight(either)) {
    return yield* toRuntimeIterable(either.right)
  }

  const finalizer = yield* toRuntimeIterable(
    context.scope.ensuring(pipe(either.left, provide(env))),
  )

  const a: A = yield new Resume(id)

  yield* toRuntimeIterable(finalizer(Right(a)))

  return a
}
