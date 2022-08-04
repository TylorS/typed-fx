import type { Instruction } from '../Fx/Instructions/Instruction.js'
import { Fx } from '../Fx/index.js'

import * as F from '@/Eff/Future/index.js'

export interface Future<R, E, A> extends F.Future<Instruction<R, E, any>, A> {}

export const complete = F.complete as <R, E, A>(
  future: Future<R, E, A>,
) => (fx: Fx<R, E, A>) => boolean
export const wait = F.wait as <R, E, A>(future: Future<R, E, A>) => Fx<R, E, A>

export const pending = F.pending as <R, E, A>() => Future<R, E, A>
