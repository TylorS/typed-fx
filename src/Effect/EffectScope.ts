import * as Maybe from 'hkt-ts/Maybe'
import { constFalse, pipe } from 'hkt-ts/function'

import type { Fiber } from './Fiber.js'

import { Atomic, update } from '@/Atomic/index.js'
import { Exit } from '@/Exit/Exit.js'

export interface EffectScope<E, A> {
  readonly children: ReadonlyArray<Fiber<any, any>>
  readonly addChild: (child: Fiber<any, any>) => number
  readonly removeChild: (child: Fiber<any, any>) => boolean
  readonly close: (exit: Exit<E, A>) => boolean
}

export function EffectScope<E, A>(onClosed: (exit: Exit<E, A>) => void): EffectScope<E, A> {
  const exit = Atomic<Maybe.Maybe<Exit<E, A>>>(Maybe.Nothing)
  const children = Atomic<ReadonlyArray<Fiber<any, any>>>([])

  const addChild = (child: Fiber<any, any>) =>
    pipe(
      children,
      update((children) => [...children, child]),
    ).length

  const removeChild = (child: Fiber<any, any>) => {
    pipe(
      children,
      update((children) => children.filter((c) => c !== child)),
    )

    return pipe(
      exit.get(),
      Maybe.match(() => false, release),
    )
  }

  const close = (e: Exit<E, A>): boolean => {
    const updated = pipe(
      exit.get(),
      Maybe.getOrElse(() => e),
    )

    exit.set(Maybe.Just(updated))

    return release(updated)
  }

  const release = (exit: Exit<E, A>) => {
    if (children.get().length === 0) {
      onClosed(exit)

      return true
    }

    return false
  }

  return {
    get children() {
      return children.get()
    },
    addChild,
    removeChild,
    close,
  }
}

export function GlobalScope(): EffectScope<any, any> {
  const children = Atomic<ReadonlyArray<Fiber<any, any>>>([])

  const addChild = (child: Fiber<any, any>) =>
    pipe(
      children,
      update((children) => [...children, child]),
    ).length

  const removeChild = (child: Fiber<any, any>) => {
    pipe(
      children,
      update((children) => children.filter((c) => c !== child)),
    )

    return false
  }

  return {
    get children() {
      return children.get()
    },
    addChild,
    removeChild,
    close: constFalse,
  }
}
