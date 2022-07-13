import { FxInstruction } from './FxInstruction'

import type { FiberScope } from '@/FiberScope/index'

export class GetFiberScope extends FxInstruction<void, never, never, FiberScope> {}

export const getFiberScope = new GetFiberScope()
