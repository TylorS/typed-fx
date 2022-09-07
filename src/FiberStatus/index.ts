import { Exit } from '@/Exit/Exit.js'

export type FiberStatus<E, A> = Suspended | Running | Done<E, A>

export interface Suspended {
  readonly tag: 'Suspended'
}
export const Suspended: Suspended = {
  tag: 'Suspended',
}

export interface Running {
  readonly tag: 'Running'
}
export const Running: Running = {
  tag: 'Running',
}

export interface Done<E, A> {
  readonly tag: 'Done'
  readonly exit: Exit<E, A>
}

export const Done = <E, A>(exit: Exit<E, A>): Done<E, A> => ({
  tag: 'Done',
  exit,
})
