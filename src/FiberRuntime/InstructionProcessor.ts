import { pipe } from 'hkt-ts'
import { Left, Right } from 'hkt-ts/Either'
import { Just, Maybe, Nothing, isJust } from 'hkt-ts/Maybe'

import { Done, GetTrace } from './RuntimeInstruction'
import { RuntimeIterable } from './RuntimeIterable'
import { processFx } from './processors/processInstruction'

import { Died } from '@/Cause/Cause'
import { Exit } from '@/Exit/Exit'
import { FiberContext } from '@/FiberContext/index'
import { pending } from '@/Future/Future'
import { complete } from '@/Future/complete'
import { wait } from '@/Future/wait'
import { Fx } from '@/Fx/Fx'
import { fromLazy, success } from '@/Fx/index'
import { Closeable, Scope } from '@/Scope/Scope'

/**
 * An InstructionProcessor is responsible for converting Fx's instruction set into the FiberRuntime's instruction set
 * and closing the associated Scope after running.
 */
export class InstructionProcessor<R, E, A> implements RuntimeIterable<E, void> {
  readonly run: <A2>(fx: Fx<R, E, A2>) => RuntimeIterable<E, A2>
  readonly close: (exit: Exit<E, A>) => RuntimeIterable<E, void>

  protected _releasing = false
  protected _released: Maybe<Exit<E, A>> = Nothing

  constructor(
    readonly fx: Fx<R, E, A>,
    readonly scope: Closeable,
    readonly getContext: () => FiberContext,
  ) {
    this.run = (fx) => processFx(fx, getContext)
    this.close = this.release.bind(this)
  }

  *[Symbol.iterator]() {
    try {
      yield* this.release(Right(yield* this.run(this.fx)))
    } catch (e) {
      yield* this.release(Left(new Died(e, yield new GetTrace())))
    }
  }

  protected *release(exit: Exit<E, A>): RuntimeIterable<E, void> {
    if (isJust(this._released)) {
      return yield new Done(this._released.value)
    }

    this._releasing = true
    const released = yield* this.run(this.scope.close(exit))

    // If we were able to release go ahead and
    if (released) {
      this.released(exit)

      return yield new Done<E>(exit)
    }

    const e = yield* waitForExit(this.scope, this.run)

    this.released(exit)

    return yield new Done<E>(e)
  }

  protected released(exit: Exit<E, A>) {
    this._releasing = false
    this._released = Just(exit)
  }
}

function* waitForExit<R, E, A>(
  scope: Scope,
  run: <A2>(fx: Fx<R, E, A2>) => RuntimeIterable<E, A2>,
) {
  const future = pending<Exit<E, A>>()

  // Wait for the Scope to close
  scope.addFinalizer((exit) => fromLazy(() => pipe(exit, success, complete(future))))

  return yield* run(wait(future))
}
