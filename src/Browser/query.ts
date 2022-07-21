import { Maybe, fromNullable } from 'hkt-ts/Maybe'
import type { ParseSelector } from 'typed-query-selector/parser'

import { Fx } from '@/Fx/Fx'
import { Service } from '@/Service/Service'

export class ParentNode extends Service {
  constructor(readonly parentNode: ParentNode & Element) {
    super()
  }
}

export const query = <S extends string>(
  selector: S,
): Fx<ParentNode, never, Maybe<ParseSelector<S>>> =>
  ParentNode.asks((p) => fromNullable(p.parentNode.querySelector<ParseSelector<S>>(selector)))

export const queryAll = <S extends string>(
  selector: S,
): Fx<ParentNode, never, ReadonlyArray<ParseSelector<S>>> =>
  ParentNode.asks((p) => Array.from(p.parentNode.querySelectorAll<ParseSelector<S>>(selector)))
