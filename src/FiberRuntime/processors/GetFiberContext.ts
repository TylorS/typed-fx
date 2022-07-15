import { GetCurrentFiberContext } from '../RuntimeInstruction'

import { FiberContext } from '@/FiberContext/index'
import { GetFiberContext } from '@/Fx/InstructionSet/GetFiberContext'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function* processGetFiberContext(_: GetFiberContext) {
  return (yield new GetCurrentFiberContext()) as FiberContext
}
