import { AnyFiber } from '@/Fiber/Fiber'
import { Service } from '@/Service/Service'
import { ServiceMap } from '@/Service/ServiceMap'

export class Layers {
  constructor(
    readonly services = new ServiceMap<Service<any>>(),
    readonly fibers = new ServiceMap<AnyFiber>(),
  ) {}
}
