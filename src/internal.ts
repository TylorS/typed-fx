export interface MapLikeIterable<K, V> extends Iterable<readonly [K, V]> {}

export type StrictExtract<T, U> = T extends U ? (U extends T ? T : never) : never

export type StrictExclude<_T, U> = _T extends infer T
  ? T extends U
    ? U extends T
      ? never
      : T
    : T
  : _T

export type InstanceOf<T> = T extends abstract new (...args: any) => infer R
  ? R
  : T extends new (...args: any) => infer R
  ? R
  : T

/* eslint-disable @typescript-eslint/no-unused-vars */
export type ConstructorParamsOf<T> = T extends abstract new (...args: infer Args) => infer _R
  ? Args
  : T extends new (...args: infer Args) => infer _R
  ? Args
  : never
/* eslint-enable @typescript-eslint/no-unused-vars */
