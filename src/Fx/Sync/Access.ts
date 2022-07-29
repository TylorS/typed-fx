import * as Eff from '../Eff/index.js'

import type { Env } from './Env.js'
import type { Sync } from './Sync.js'

export class Access<R, R2, E, A> extends Eff.Access<Env<R>, Sync<R2, E, A>, A> {}
