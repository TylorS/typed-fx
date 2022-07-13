import { success } from '@/Fx/index'
import { Supervisor } from './Supervisor'

export const None = new Supervisor(success(new Set()))
export type None = typeof None

export const isNone = (s: Supervisor): s is None => s === None
