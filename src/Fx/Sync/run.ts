import { pipe } from 'hkt-ts'
import { isLeft, mapLeft } from 'hkt-ts/Either'

import { prettyPrint } from '../Cause/Renderer.js'
import * as Trace from '../Trace/Trace.js'

import { Env, Environment } from './Env.js'
import { Sync } from './Sync.js'

import { Cause, traced } from '@/Fx/Cause/Cause.js'
import { provide } from '@/Fx/Eff/Access.js'
import { runEff } from '@/Fx/Eff/Eff.js'
import { attempt } from '@/Fx/Eff/Failure.js'
import { handleFromLazy } from '@/Fx/Eff/FromLazy.js'
import { withTracing } from '@/Fx/Eff/Trace.js'
import { Exit } from '@/Fx/Exit/Exit.js'

export function runWith<R, E, A>(sync: Sync<R, E, A>, env: Env<R>): Exit<E, A> {
  const [exit, trace] = pipe(
    sync,
    provide<Env<R>>(env),
    attempt,
    withTracing,
    handleFromLazy,
    runEff,
  )

  return pipe(exit, mapLeft(traced(trace)))
}

export function run<E, A>(sync: Sync<never, E, A>): Exit<E, A> {
  return runWith(sync, new Environment())
}

export function runOrThrow<E, A>(sync: Sync<never, E, A>): A {
  const exit = run(sync)

  if (isLeft(exit)) {
    throw new CauseError(exit.left)
  }

  return exit.right
}

export class CauseError<E> extends Error {
  constructor(readonly causedBy: Cause<E>) {
    const [message, trace] = causeAndTrace(causedBy)

    super(message)

    // If there is a Trace, add it to the Error
    if (trace.tag !== 'EmptyTrace') {
      this.stack = Trace.Debug.debug(trace)
    }
  }
}

function causeAndTrace<E>(cause: Cause<E>) {
  let trace: Trace.Trace = Trace.EmptyTrace
  let causeToPrint = cause

  while (causeToPrint.tag === 'Traced') {
    trace = Trace.Associative.concat(trace, causeToPrint.trace)
    causeToPrint = causeToPrint.cause
  }

  return [prettyPrint(causeToPrint), trace] as const
}
