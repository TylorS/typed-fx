import { Branded } from 'hkt-ts/Branded'

import type { Fx } from './Fx.js'

import { Disposable } from '@/Disposable/Disposable.js'
import * as IOFuture from '@/IO/IOFuture.js'

export interface Future<R, E, A>
  extends Branded<{ readonly Resources: R }, IOFuture.IOFuture<E, A>> {}

export function addObserver<R, E, A>(
  future: Future<R, E, A>,
  observer: Observer<R, E, A>,
): Disposable {
  return IOFuture.addObserver(future, observer as any)
}

export interface Observer<R, E, A> {
  (fx: Fx<R, E, A>): void
}

export function complete<R, E, A>(future: Future<R, E, A>) {
  return (fx: Fx<R, E, A>) => IOFuture.complete(future)(fx)
}
