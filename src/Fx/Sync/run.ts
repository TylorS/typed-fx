import { pipe } from 'hkt-ts'
import { mapLeft } from 'hkt-ts/Either'

import { traced } from '../Cause/Cause'
import { withTracing } from '../Eff/Trace'
import { Trace } from '../Trace/Trace'

import { Sync, addTrace } from './Sync'

import { provide } from '@/Fx/Eff/Access'
import { runEff } from '@/Fx/Eff/Eff'
import { attempt } from '@/Fx/Eff/Failure'
import { Exit } from '@/Fx/Exit/Exit'

export function run<R, E, A>(sync: Sync<R, E, A>, env: R): Exit<E, A> {
  const [exit, trace] = pipe(
    Sync(function* () {
      yield* addTrace(Trace.runtime(run))
      return yield* sync
    }),
    provide(env),
    attempt,
    withTracing,
    runEff,
  )

  return pipe(exit, mapLeft(traced(trace)))
}
