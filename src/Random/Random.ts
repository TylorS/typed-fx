import { Of } from '@/Fx/Fx'
import { fromLazy } from '@/Fx/InstructionSet/FromLazy'
import { Service } from '@/Service/Service'

export class Random extends Service {
  constructor(readonly getRandomNumber: Of<number>) {
    super()
  }

  static math = Random.layerOf(new Random(fromLazy(() => Math.random())))
}
