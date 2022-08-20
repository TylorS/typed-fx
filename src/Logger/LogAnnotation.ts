import { ReadonlyRecord } from 'hkt-ts/Record'

import { FiberRef } from '@/FiberRef/FiberRef.js'
import { fromLazy } from '@/Fx/Fx.js'

export interface LogAnnotation {
  readonly label: string
  readonly message: string
}

export function LogAnnotation(label: string, message: string): LogAnnotation {
  return {
    label,
    message,
  }
}

export const CurrentLogAnnotations = FiberRef.make(
  fromLazy((): ReadonlyRecord<string, string> => ({})),
)
