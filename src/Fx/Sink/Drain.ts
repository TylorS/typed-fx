import { Left, Right } from 'hkt-ts/Either'
import { constant } from 'hkt-ts/function'

import { Cause } from '../Cause/Cause.js'
import * as Fx from '../Fx/index.js'
import { Closeable } from '../Scope/Closeable.js'

import { Sink } from './Sink.js'

export class Drain<E, A> implements Sink<E, A> {
  constructor(readonly scope: Closeable) {}

  readonly event = constant(Fx.unit)
  readonly error = (cause: Cause<E>) => this.scope.close(Left(cause))
  readonly end = this.scope.close(Right(undefined))
}
