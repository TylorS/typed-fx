export type FiberStatus = Suspended | Running | Exiting | Done

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

export interface Exiting {
  readonly tag: 'Exiting'
  readonly isInterruptable: false
}
export const Exiting: Exiting = {
  tag: 'Exiting',
  isInterruptable: false,
}

export interface Done {
  readonly tag: 'Done'
  readonly isInterruptable: false
}
export const Done: Done = {
  tag: 'Done',
  isInterruptable: false,
}
