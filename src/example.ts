import { createInterface } from 'readline'

import { flow, pipe } from 'hkt-ts'
import * as Maybe from 'hkt-ts/Maybe'

import * as Fx from './Fx/index.js'
import * as Ref from './Ref/index.js'
import * as Service from './Service/index.js'

const VALID_YES_ANSWERS = ['y', 'yes', 'sure']
const VALID_NO_ANSWERS = ['n', 'no', 'nope']
const MIN = 1
const MAX = 5

// Servies
class AskQuestion extends Service.fn<(s: string) => Fx.Of<string>>()('AskQuestion') {}
class PutStr extends Service.fn<(s: string) => Fx.Of<void>>()('PutString') {}
class RandomNumber extends Service.fn<() => Fx.Of<number>>()('RandomNumber') {}

// Refs
class Name extends Ref.Ref('Name', AskQuestion.apply('What is your name?')) {}
class ShouldContinue extends Ref.Ref('ShouldContinue', Fx.now(true)) {}
class Secret extends Ref.Ref('Secret', RandomNumber.apply()) {}

const welcomeToTheGame = pipe(
  Name.get(),
  Fx.flatMap((name) => PutStr.apply(`Hello ${name}, welcome to the game!`)),
)

const unknownGuess = PutStr.apply(`You did not enter an integer!`)

const wrongGuess = Fx.Fx(function* () {
  const secret = yield* Secret.get()
  const name = yield* Name.get()

  yield* PutStr.apply(`You guessed wrong, ${name}! The number was: ${secret}`)
})

const correctGuess = Fx.Fx(function* () {
  const name = yield* Name.get()

  yield* PutStr.apply(`You guessed right, ${name}!`)
})

const askToContinue = Fx.Fx(function* () {
  const name = yield* Name.get()
  const answer = yield* AskQuestion.apply(`Do you want to continue, ${name}? (y/n)`)

  if (VALID_YES_ANSWERS.includes(answer.toLowerCase())) {
    return Maybe.Just(yield* ShouldContinue.set(true))
  }

  if (VALID_NO_ANSWERS.includes(answer.toLowerCase())) {
    return Maybe.Just(yield* ShouldContinue.set(false))
  }

  return Maybe.Nothing
})

const askToContinueUntilAnswered = Fx.Fx(function* () {
  let response = yield* askToContinue

  while (Maybe.isNothing(response)) {
    response = yield* askToContinue
  }
})

const round = Fx.Fx(function* () {
  const name: string = yield* Name.get()
  const secret: number = yield* Secret.get()
  const answer: Maybe.Maybe<number> = parseInteger(
    yield* AskQuestion.apply(`Dear ${name}, guess a number between ${MIN} and ${MAX}`),
  )

  yield* pipe(
    answer,
    Maybe.match(
      () => unknownGuess,
      (a) => (a === secret ? correctGuess : wrongGuess),
    ),
  )

  yield* Secret.set(yield* RandomNumber.apply())
})

const game = Fx.Fx(function* () {
  yield* welcomeToTheGame

  while (yield* ShouldContinue.get()) {
    yield* round
    yield* askToContinueUntilAnswered
  }
})

const readResponse = Fx.fromPromise(
  () =>
    new Promise<string>((resolve) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      rl.question('> ', (answer) => {
        rl.close()
        resolve(answer)
      })
    }),
)

const main = pipe(
  game,
  Fx.provideLayers(
    Ref.atomic(Name),
    Ref.atomic(ShouldContinue),
    Ref.atomic(Secret),
    RandomNumber.layerOf(() =>
      Fx.fromLazy(() => Math.floor((MAX - MIN + 1) * Math.random() + MIN)),
    ),
    AskQuestion.layerOf((s) =>
      Fx.lazy(() => {
        console.log(s)

        return readResponse
      }),
    ),
    PutStr.layerOf(flow(console.log, Fx.now)),
  ),
)

function parseInteger(s: string): Maybe.Maybe<number> {
  const i = parseInt(s, 10)

  return Number.isNaN(i) ? Maybe.Nothing : Maybe.Just(i)
}

Fx.runMain(main).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
