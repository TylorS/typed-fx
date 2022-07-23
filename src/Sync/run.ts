import { pipe } from 'hkt-ts'

import { Env, provide } from './Env'
import { attempt } from './Fail'
import { Sync } from './Sync'

import { runEff } from '@/Eff/Eff'
import { Exit } from '@/Exit/Exit'

export function runSync<R, E, A>(sync: Sync<R, E, A>, env: Env<R>): Exit<E, A> {
  return pipe(sync, provide(env), attempt, runEff)
}

export function run<E, A>(sync: Sync<never, E, A>): Exit<E, A> {
  return runSync(sync, new Env())
}
