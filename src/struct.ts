import { pipe } from 'effect'

import { Fx } from './Fx.js'
import { combineAll } from './combine.js'
import { map } from './filterMap.js'

export const struct = <Props extends Readonly<Record<string, Fx<any, any, any>>>>(
  props: Props,
): Fx<
  Fx.ResourcesOf<Props[string]>,
  Fx.ErrorsOf<Props[string]>,
  { readonly [K in keyof Props]: Fx.OutputOf<Props[K]> }
> =>
  pipe(
    combineAll(
      Object.entries(props).map(([key, fx]) =>
        pipe(
          fx,
          map((value) => ({ [key]: value })),
        ),
      ),
    ),
    map((values) => Object.assign({}, ...values)),
  )
