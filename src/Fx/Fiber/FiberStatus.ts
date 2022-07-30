export type FiberStatus = Suspended | Running | Done

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

export interface Done {
  readonly tag: 'Done'
}
export const Done: Done = {
  tag: 'Done',
}
