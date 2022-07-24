import { pipe } from 'hkt-ts'

import { Sync } from './Sync'

import { provide } from '@/Eff/Access'
import { runEff } from '@/Eff/Eff'
import { attempt } from '@/Eff/Failure'
import { Exit } from '@/Exit/Exit'

export function runWith<R, E, A>(sync: Sync<R, E, A>, env: R): Exit<E, A> {
  return pipe(sync, provide(env), attempt, runEff)
}

export function run<E, A>(sync: Sync<never, E, A>): Exit<E, A> {
  return runWith(sync, {} as never)
}
