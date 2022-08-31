import { IO } from './IO.js'

import { Cause } from '@/Cause/index.js'
import { Exit } from '@/Exit/index.js'

export type IOFrame = ValueFrame | CauseFrame | ExitFrame | MapFrame

export class ValueFrame {
  readonly tag = 'Value'
  constructor(readonly f: (value: any) => IO<any, any>) {}
}

export class CauseFrame {
  readonly tag = 'Cause'
  constructor(readonly f: (value: Cause<any>) => IO<any, any>) {}
}

export class ExitFrame {
  readonly tag = 'Exit'
  constructor(readonly f: (value: Exit<any, any>) => IO<any, any>) {}
}

export class MapFrame {
  readonly tag = 'Map'
  constructor(readonly f: (value: any) => any) {}
}
