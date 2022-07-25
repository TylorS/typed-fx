import { pipe } from 'hkt-ts'
import { mapLeft } from 'hkt-ts/Either'
import { U } from 'ts-toolbelt'

import { Sync, addTrace } from './Sync'

import { traced } from '@/Fx/Cause/Cause'
import { provide } from '@/Fx/Eff/Access'
import { runEff } from '@/Fx/Eff/Eff'
import { attempt } from '@/Fx/Eff/Failure'
import { withTracing } from '@/Fx/Eff/Trace'
import { Exit } from '@/Fx/Exit/Exit'
import { Trace } from '@/Fx/Trace/Trace'

export function runWith<R, E, A>(
  sync: Sync<R, E, A>,
  env: [U.IntersectOf<R>] extends [infer T] ? { readonly [K in keyof T]: T[K] } : never,
): Exit<E, A> {
  const [exit, trace] = pipe(
    Sync(function* () {
      yield* addTrace(Trace.runtime({}, runWith))
      return yield* sync
    }),
    provide(env as any),
    attempt,
    withTracing,
    runEff,
  )

  return pipe(exit, mapLeft(traced(trace)))
}

export function run<E, A>(sync: Sync<never, E, A>): Exit<E, A> {
  return runWith(sync, {} as never)
}
