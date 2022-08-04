import { Maybe, Nothing } from 'hkt-ts/Maybe'

import { Exit } from '@/Exit/Exit.js'
import { Finalizer, FinalizerKey } from '@/Fx/Finalizer/Finalizer.js'

export type ScopeState = Open | Closing | Closed

export interface Open {
  readonly tag: 'Open'
  readonly keys: ReadonlyArray<FinalizerKey>
  readonly finalizers: ReadonlyMap<FinalizerKey, Finalizer>
  readonly exit: Maybe<Exit<any, any>>
}

export const Open = (
  keys: ReadonlyArray<FinalizerKey>,
  finalizers: ReadonlyMap<FinalizerKey, Finalizer>,
  exit: Maybe<Exit<any, any>> = Nothing,
): Open => ({
  tag: 'Open',
  keys,
  finalizers,
  exit,
})

export interface Closing {
  readonly tag: 'Closing'
  readonly finalizers: ReadonlyMap<FinalizerKey, Finalizer>
  readonly exit: Exit<any, any>
}

export function Closing(
  finalizers: ReadonlyMap<FinalizerKey, Finalizer>,
  exit: Exit<any, any>,
): Closing {
  return {
    tag: 'Closing',
    finalizers,
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
