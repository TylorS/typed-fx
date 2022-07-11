import { Scheduler } from './Scheduler'

export class DefaultScheduler extends Scheduler {
  constructor() {
    super((fx, environment, schedule) => {})
  }
}
