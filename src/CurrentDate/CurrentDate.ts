import { Service } from '@/Service/Service'

export class CurrentDate extends Service {
  constructor(readonly currentDate: () => Date) {
    super()
  }

  static live = CurrentDate.layerOf(new CurrentDate(() => new Date()))
}
