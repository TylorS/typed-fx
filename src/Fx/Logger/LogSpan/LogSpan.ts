import { Time } from '@/Time/index.js'

export class LogSpan {
  constructor(readonly label: string, readonly startTime: Time) {}
}
