export class Stack<A> {
  constructor(readonly value: A, readonly previous?: Stack<A>) {}

  readonly push = (value: A): Stack<A> => new Stack(value, this)
  readonly pop = (): Stack<A> | undefined => this.previous
}
