import { pipe } from 'hkt-ts'
import { mapLeft } from 'hkt-ts/Either'
import { U } from 'ts-toolbelt'

import { Sync } from './Sync.js'

import { traced } from '@/Fx/Cause/Cause.js'
import { provide } from '@/Fx/Eff/Access.js'
import { runEff } from '@/Fx/Eff/Eff.js'
import { attempt } from '@/Fx/Eff/Failure.js'
import { withTracing } from '@/Fx/Eff/Trace.js'
import { Exit } from '@/Fx/Exit/Exit.js'

export function runWith<R, E, A>(sync: Sync<R, E, A>, env: U.IntersectOf<R>): Exit<E, A> {
  const [exit, trace] = pipe(sync, provide<R>(env as R), attempt, withTracing, runEff)

  return pipe(exit, mapLeft(traced(trace)))
}

export function run<E, A>(sync: Sync<never, E, A>): Exit<E, A> {
  return runWith(sync, {} as never)
}
