import { Just, Maybe, Nothing } from 'hkt-ts/Maybe'

import { Exit } from '@/Exit/Exit.js'

export type ScopeState = Open | Closing | Closed

export interface Open {
  readonly tag: 'Open'
}

export const Open: Open = { tag: 'Open' }

export interface Closing {
  readonly tag: 'Closing'
  readonly exit: Exit<any, any>
}

export function Closing(exit: Exit<any, any>): Closing {
  return {
    tag: 'Closing',
    exit,
  }
}

export interface Closed {
  readonly tag: 'Closed'
  readonly exit: Exit<any, any>
}

export function Closed(exit: Exit<any, any>): Closed {
  return {
    tag: 'Closed',
    exit,
  }
}

export function getExit(state: ScopeState): Maybe<Exit<any, any>> {
  switch (state.tag) {
    case 'Closing':
    case 'Closed':
      return Just(state.exit)
    default:
      return Nothing
  }
}
