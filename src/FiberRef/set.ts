import { modify } from './modify'

import { success } from '@/Fx/index'

export function set<A>(a: A) {
  return modify(() => success([a, a] as const))
}
