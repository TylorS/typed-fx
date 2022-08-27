import { Time } from '@/Time/index.js'

export interface LogSpan {
  readonly label: string
  readonly start: Time
}

export function LogSpan(label: string, start: Time): LogSpan {
  return { label, start }
}
