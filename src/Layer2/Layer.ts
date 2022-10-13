import { Env } from '@/Env2/Env.js'
import { FiberRef } from '@/FiberRef/FiberRef.js'
import { Scope } from '@/Scope/Scope.js'

export interface Layer<R, E, A> extends FiberRef<R | Scope, E, Env<A>> {}
