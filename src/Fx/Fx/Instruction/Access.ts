import { Fx } from '../Fx.js'

import * as Eff from '@/Fx/Eff/index.js'
import { Env } from '@/Fx/Env/Env.js'

export class Access<R, R2, E, A> extends Eff.Access<Env<R>, Fx<R2, E, A>, A> {}
