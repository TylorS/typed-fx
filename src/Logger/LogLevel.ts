import { FiberRef } from '@/FiberRef/FiberRef.js'
import { fromLazy } from '@/Fx/Fx.js'

export enum LogLevel {
  None,
  Fatal,
  Error,
  Warn,
  Info,
  Debug,
  Trace,
  All,
}

export const CurrentLogLevel = FiberRef.make(fromLazy(() => LogLevel.Info))
