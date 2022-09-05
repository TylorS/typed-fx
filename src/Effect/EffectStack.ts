import { Effect } from './Effect.js'

import { Cause } from '@/Cause/index.js'
import { Exit } from '@/Exit/index.js'
import { Stack } from '@/Stack/index.js'

export type EffectFrame =
  | MapFrame
  | FlatMapFrame
  | OrElseFrame
  | MatchFrame
  | PopFrame
  | InterruptFrame

export interface MapFrame {
  readonly tag: 'Map'
  readonly f: (a: any) => any
}

export function MapFrame(f: (a: any) => any): MapFrame {
  return { tag: 'Map', f }
}

export interface FlatMapFrame {
  readonly tag: 'FlatMap'
  readonly f: (a: any) => Effect<any, any, any>
}

export function FlatMapFrame(f: (a: any) => Effect<any, any, any>): FlatMapFrame {
  return { tag: 'FlatMap', f }
}

export interface OrElseFrame {
  readonly tag: 'OrElse'
  readonly f: (e: Cause<any>) => Effect<any, any, any>
}

export function OrElseFrame(f: (e: Cause<any>) => Effect<any, any, any>): OrElseFrame {
  return { tag: 'OrElse', f }
}

export interface MatchFrame {
  readonly tag: 'Match'
  readonly f: (exit: Exit<any, any>) => Effect<any, any, any>
}

export function MatchFrame(f: (exit: Exit<any, any>) => Effect<any, any, any>): MatchFrame {
  return { tag: 'Match', f }
}

export interface PopFrame {
  readonly tag: 'Pop'
  readonly pop: () => void
}

export function PopFrame(pop: () => void): PopFrame {
  return { tag: 'Pop', pop }
}

export interface InterruptFrame {
  readonly tag: 'Interrupt'
}

export const InterruptFrame: InterruptFrame = {
  tag: 'Interrupt',
}

export class EffectStack extends Stack<EffectFrame> {}
