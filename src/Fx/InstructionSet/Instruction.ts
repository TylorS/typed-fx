/* eslint-disable @typescript-eslint/no-unused-vars */
// TODO: GetContext
// TODO: GetFiberRefs
// TODO: GetRuntime
// TODO: Tracing

import type { Fx } from '../Fx'

import type { Access } from './Access'
import { Async } from './Async'
import { Fork } from './Fork'
import type { FromExit } from './FromExit'
import type { LazyFx } from './FromLazy'
import { FromTuple } from './FromTuple'
import { GetFiberScope } from './GetFiberScope'
import { Join } from './Join'
import { Provide } from './Provide'
import { ProvideLayers } from './ProvideLayers'
import { Race } from './Race'
import type { Result } from './Result'
import { SetInterruptible } from './SetInterruptable'
import { WithConcurrency } from './WithConcurrency'

import type * as Layer from '@/Layer/Layer'
import type { Service } from '@/Service/Service'

export type Instruction<R extends Service<any> = never, E = never, A = never> =
  | Access<R, R, E, A>
  | Async<R, E, A>
  | Fork<R, E, A>
  | FromExit<E, A>
  | FromTuple<readonly Fx<R, E, any>[]>
  | GetFiberScope
  | Join<E, A>
  | LazyFx<Fx<R, E, A>>
  | Provide<never, E, A>
  | ProvideLayers<Fx<R, E, A>, readonly Layer.AnyLayer[]>
  | Race<readonly Fx<R, E, any>[]>
  | Result<R, E, A>
  | SetInterruptible<Fx<R, E, A>>
  | WithConcurrency<Fx<R, E, A>>
