import { Time } from '@/Clock/Clock'

export class LogSpan {
  constructor(readonly label: string, readonly startTime: Time) {}
}
