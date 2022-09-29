import { Left, Right } from 'hkt-ts/Either'

import { Fx } from './Fx.js'
import * as Instr from './Instruction.js'

import * as Cause from '@/Cause/index.js'
import { Exit } from '@/Exit/Exit.js'

/**
 * Keeps track of the current status of a Fiber and the Frames that remain to be executed
 */
export class FrameManager<E, A> {
  public instr: Instr.Instruction | null = null

  constructor(
    protected _frames: Instr.Frame<any, any, any, any, any>[],
    protected _onDone: (exit: Exit<E, A>) => void,
  ) {}

  public pushFrames(...frames: Instr.Frame<any, any, any, any, any>[]) {
    this._frames.push(...frames)
  }

  public hasFrames() {
    return this._frames.length > 0
  }

  public continueWith(a: any) {
    const frame = this._frames.pop()

    if (!frame) {
      return this.done(Right(a))
    }

    const tag = frame.tag

    if (tag === Instr.FlatMapFrame.tag) {
      return this.setInstr(frame.f(a))
    } else if (tag === Instr.MapFrame.tag) {
      a = frame.f(a)
    } else if (tag === Instr.AttemptFrame.tag) {
      return this.setInstr(frame.f(Right(a)))
    } else if (tag === Instr.BimapFrame.tag) {
      a = frame.g(a)
    } else if (tag === Instr.PopFrame.tag) {
      frame.pop()
    }

    this.continueWith(a)
  }

  public continueWithCause(cause: Cause.Cause<any>): void {
    const frame = this._frames.pop()

    if (!frame) {
      return this.done(Left(cause))
    }

    const tag = frame.tag

    if (tag === Instr.AttemptFrame.tag) {
      return this.setInstr(frame.f(Left(cause)))
    } else if (tag === Instr.OrElseFrame.tag) {
      return this.setInstr(frame.f(cause))
    } else if (tag === Instr.BimapFrame.tag || tag === Instr.MapLeftFrame.tag) {
      cause = Cause.map(frame.f)(cause)
    } else if (tag === Instr.PopFrame.tag) {
      frame.pop()
    }

    this.continueWithCause(cause)
  }

  private done(exit: Exit<E, A>) {
    this.instr = null
    this._onDone(exit)
  }

  public setInstr<R, E, A>(fx: Fx<R, E, A>) {
    if (fx.tag === Instr.ControlFrame.tag) {
      const cf = fx as Instr.ControlFrame<any, any, any, any, any, any>
      this.instr = cf.fx as Instr.Instruction
      this._frames.push(...cf.frames)
    } else {
      this.instr = fx as Instr.Instruction
    }
  }

  protected popFrame() {
    return this._frames.pop()
  }
}
