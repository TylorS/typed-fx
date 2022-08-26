import { deleteFiberRef, getFiberRef, modifyFiberRef } from '@/Fx/Fx.js'

export const get = getFiberRef
export const modify = modifyFiberRef
export const remove = deleteFiberRef

export { remove as delete }

export const set = <A>(value: A) => modify(() => [value, value])
export const getAndSet = <A>(value: A) => modify((a) => [a, value])

export const update = <A>(f: (a: A) => A) =>
  modify((a: A) => {
    const a2 = f(a)

    return [a2, a2]
  })

export const getAndUpdate = <A>(f: (a: A) => A) => modify((a: A) => [a, f(a)])
