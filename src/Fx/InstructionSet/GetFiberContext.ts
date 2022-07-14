import { FxInstruction } from './FxInstruction'

import type { FiberContext } from '@/FiberContext/index'

export class GetFiberContext extends FxInstruction<void, never, never, FiberContext> {}

export const getFiberContext = new GetFiberContext()
