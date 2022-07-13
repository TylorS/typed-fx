import { Service } from '@/Service/Service'

export class Console extends Service {
  constructor(readonly console: globalThis.Console) {
    super()
  }
}
