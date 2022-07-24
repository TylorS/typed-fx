import { Time } from '@/Time/index'

export class LogSpan {
  constructor(readonly label: string, readonly startTime: Time) {}
}
