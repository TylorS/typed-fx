import { modify } from './modify'

import { success } from '@/Fx/index'

export function getAndSet<A>(a: A) {
  return modify((x: A) => success([x, a] as const))
}
