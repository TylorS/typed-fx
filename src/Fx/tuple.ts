import { AnyFx, ErrorsOf, Fx, OutputOf, ResourcesOf } from './Fx'

export const tuple = <FX extends ReadonlyArray<AnyFx>>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ..._fx: FX
): Fx<
  ResourcesOf<FX[number]>,
  ErrorsOf<FX[number]>,
  { readonly [K in keyof FX]: OutputOf<FX[K]> }
> =>
  // eslint-disable-next-line require-yield
  Fx(function* () {
    // TODO: Enable this to function properly
    return []
  }) as any
