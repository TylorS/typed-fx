export type FiberStatus = Suspended | Running | Done

export interface Suspended {
  readonly tag: 'Suspended'
  readonly isInterruptable: boolean
}
export const Suspended = (isInterruptable: boolean): Suspended => ({
  tag: 'Suspended',
  isInterruptable,
})

export interface Running {
  readonly tag: 'Running'
  readonly isInterruptable: boolean
}
export const Running = (isInterruptable: boolean): Running => ({
  tag: 'Running',
  isInterruptable,
})

export interface Done {
  readonly tag: 'Done'
  readonly isInterruptable: false
}
export const Done: Done = {
  tag: 'Done',
  isInterruptable: false,
}

export const setInterruptStatus = (isInterruptable: boolean) => {
  return (status: FiberStatus): FiberStatus => {
    if (status.tag === 'Done') {
      return status
    }

    if (status.tag === 'Running') {
      return Running(isInterruptable)
    }

    return Suspended(isInterruptable)
  }
}
