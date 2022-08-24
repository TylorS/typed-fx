import { AnyExit } from '@/Exit/Exit.js'

export type FiberStatus = Suspended | Running | Done

export interface Suspended {
  readonly tag: 'Suspended'
  readonly isInterruptable: boolean
}
export const Suspended = (isInterruptable: () => boolean): Suspended => ({
  tag: 'Suspended',
  get isInterruptable() {
    return isInterruptable()
  },
})

export interface Running {
  readonly tag: 'Running'
  readonly isInterruptable: boolean
}
export const Running = (isInterruptable: () => boolean): Running => ({
  tag: 'Running',
  get isInterruptable() {
    return isInterruptable()
  },
})

export interface Done {
  readonly tag: 'Done'
  readonly isInterruptable: false
  readonly exit: AnyExit
}

export const Done = (exit: AnyExit): Done => ({
  tag: 'Done',
  isInterruptable: false,
  exit,
})
