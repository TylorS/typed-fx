import { flow } from 'hkt-ts'

import { Fx } from '@/Fx/Fx'
import { fromLazy } from '@/Fx/index'
import { Stream } from '@/Stream/Stream'
import { fromCallback } from '@/Stream/fromCallback'

export function addEventListener<
  El extends HTMLElement,
  T extends keyof HTMLElementEventMap,
  R,
  E,
  A,
>(
  element: El,
  eventType: T,
  f: (event: WithCurrentTarget<HTMLElementEventMap[T], El>) => Fx<R, E, A>,
  options?: AddEventListenerOptions,
): Stream<R, E, A>

export function addEventListener<
  El extends SVGElement,
  T extends keyof SVGElementEventMap,
  R,
  E,
  A,
>(
  element: El,
  eventType: T,
  f: (event: WithCurrentTarget<SVGElementEventMap[T], El>) => Fx<R, E, A>,
  options?: AddEventListenerOptions,
): Stream<R, E, A>

export function addEventListener<T extends keyof WindowEventMap, R, E, A>(
  element: Window,
  eventType: T,
  f: (event: WithCurrentTarget<WindowEventMap[T], Window>) => Fx<R, E, A>,
  options?: AddEventListenerOptions,
): Stream<R, E, A>

export function addEventListener<T extends keyof DocumentEventMap, R, E, A>(
  element: Document,
  eventType: T,
  f: (event: WithCurrentTarget<DocumentEventMap[T], Document>) => Fx<R, E, A>,
  options?: AddEventListenerOptions,
): Stream<R, E, A>

export function addEventListener<El extends Element, T extends keyof ElementEventMap, R, E, A>(
  element: El,
  eventType: T,
  f: (event: WithCurrentTarget<ElementEventMap[T], El>) => Fx<R, E, A>,
  options?: AddEventListenerOptions,
): Stream<R, E, A>

export function addEventListener<R, E, A>(
  element: EventTarget,
  eventType: string,
  f: (event: Event) => Fx<R, E, A>,
  options?: AddEventListenerOptions,
): Stream<R, E, A>

export function addEventListener<R, E, A>(
  target: EventTarget,
  eventName: string,
  f: (event: Event) => Fx<R, E, A>,
  options?: AddEventListenerOptions,
): Stream<R, E, A> {
  return fromCallback((cb) =>
    fromLazy(() => {
      const listener = flow(f, cb)

      target.addEventListener(eventName, listener, options)

      return () =>
        fromLazy(() => {
          target.removeEventListener(eventName, listener, options)
        })
    }),
  )
}

export type WithCurrentTarget<Ev, T> = Ev & { readonly currentTarget: T }
