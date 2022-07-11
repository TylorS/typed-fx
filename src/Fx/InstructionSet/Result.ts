import { FxInstruction } from './FxInstruction'

import { Exit } from '@/Exit/Exit'
import { Fx } from '@/Fx/Fx'
import { Service } from '@/Service/Service'

export class Result<in out R extends Service<any>, out E, out A> extends FxInstruction<
  Fx<R, E, A>,
  R,
  never,
  Exit<E, A>
> {}
