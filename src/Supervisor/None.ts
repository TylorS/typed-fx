import { Supervisor } from './Supervisor'

import { unit } from '@/Fx/index'

export const None = new Supervisor<any>(unit)
export type None = typeof None
