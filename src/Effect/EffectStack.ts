import { Either, Maybe, flow } from 'hkt-ts'
import { match } from 'hkt-ts/Either'

import { Effect } from './Effect.js'

import { Cause } from '@/Cause/index.js'
import { Exit } from '@/Exit/index.js'
import { Stack } from '@/Stack/index.js'

export type EffectFrame = MapFrame | FlatMapFrame | OrElseFrame | MatchFrame

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

export class EffectStack extends Stack<EffectFrame> {
  public push(frame: EffectFrame): EffectStack {
    const optimized = optimizeEffectFrame(frame, this.value)

    if (Maybe.isJust(optimized)) {
      return super.replace(() => optimized.value)
    }

    return super.push(frame)
  }
}

const optimizeEffectFrame = (
  previous: EffectFrame,
  frame: EffectFrame,
): Maybe.Maybe<EffectFrame> => {
  if (frame.tag === 'FlatMap') return optimizeFlatMapFrame(previous, frame)
  if (frame.tag === 'Match') return optimizeMatchFrame(previous, frame)
  if (frame.tag === 'OrElse') return optimizeOrElseFrame(previous, frame)

  return optimizeMapFrame(previous, frame)
}

const optimizeMapFrame = (previous: EffectFrame, frame: MapFrame): Maybe.Maybe<EffectFrame> => {
  const prev = previous.tag

  if (prev === 'Map') {
    return Maybe.Just(MapFrame(flow(previous.f, frame.f)))
  }

  return Maybe.Nothing
}

const optimizeFlatMapFrame = (
  previous: EffectFrame,
  frame: FlatMapFrame,
): Maybe.Maybe<EffectFrame> => {
  const prev = previous.tag

  if (prev === 'Map') {
    return Maybe.Just(FlatMapFrame(flow(previous.f, frame.f)))
  }

  return Maybe.Nothing
}

const optimizeOrElseFrame = (
  previous: EffectFrame,
  frame: OrElseFrame,
): Maybe.Maybe<EffectFrame> => {
  const prev = previous.tag

  if (prev === 'FlatMap') {
    return Maybe.Just(MatchFrame(match(frame.f, previous.f)))
  }

  return Maybe.Nothing
}

const optimizeMatchFrame = (previous: EffectFrame, frame: MatchFrame): Maybe.Maybe<EffectFrame> => {
  const prev = previous.tag

  if (prev === 'Map') {
    return Maybe.Just(MatchFrame(flow(Either.map(previous.f), frame.f)))
  }

  return Maybe.Nothing
}
