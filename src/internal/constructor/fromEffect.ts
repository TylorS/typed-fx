import type { Either } from "@effect/data/Either"
import { flow } from "@effect/data/Function"
import type { Option } from "@effect/data/Option"
import type { Cause } from "@effect/io/Cause"
import * as Effect from "@effect/io/Effect"
import type { Fiber } from "@effect/io/Fiber"
import type { Fx, Sink } from "@typed/fx/Fx"

/**
 * Construct a Fx from an Effect.
 * @since 1.0.0
 * @category Constructor
 */
export function fromEffect<Services, Errors, Output>(
  effect: Effect.Effect<Services, Errors, Output>
): Fx<Services, Errors, Output> {
  return new FromEffect(effect)
}

/**
 * @internal
 */
export class FromEffect<Services, Errors, Output> implements Fx<Services, Errors, Output> {
  readonly _tag = "FromEffect"
  constructor(readonly effect: Effect.Effect<Services, Errors, Output>) {}

  run<Services2>(sink: Sink<Services2, Errors, Output>) {
    return Effect.matchCauseEffect(this.effect, sink.error, flow(sink.event, Effect.zipRight(sink.end)))
  }
}

/**
 * Type guard for FromEffect.
 * @since 1.0.0
 * @category Type Guard
 */
export function isFromEffect<Services, Errors, Output>(
  fx: Fx<Services, Errors, Output>
): fx is FromEffect<Services, Errors, Output> {
  return fx instanceof FromEffect
}

export const succeed: <A>(value: A) => Fx<never, never, A> = flow(Effect.succeed, fromEffect)

export const fail: <E>(error: E) => Fx<never, E, never> = flow(Effect.fail, fromEffect)

export const failCause: <E>(cause: Cause<E>) => Fx<never, E, never> = flow(Effect.failCause, fromEffect)

export const promise: <A>(promise: () => Promise<A>) => Fx<never, unknown, A> = flow(Effect.promise, fromEffect)

export const promiseInterrupt: <A>(promise: (signal: AbortSignal) => Promise<A>) => Fx<never, unknown, A> = flow(
  Effect.promiseInterrupt,
  fromEffect
)

export const fromOption: <A>(option: Option<A>) => Fx<never, Option<never>, A> = flow(
  Effect.fromOption,
  fromEffect
)

export const fromEither: <E, A>(either: Either<E, A>) => Fx<never, E, A> = flow(Effect.fromEither, fromEffect)

export const fromEitherCause: <E, A>(either: Either<Cause<E>, A>) => Fx<never, E, A> = flow(
  Effect.fromEitherCause,
  fromEffect
)

export const fromFiber: <Errors, Output>(fiber: Fiber<Errors, Output>) => Fx<never, Errors, Output> = flow(
  Effect.fromFiber,
  fromEffect
)

export const fromFiberEffect: <Services, Errors, Output>(
  fiber: Effect.Effect<Services, Errors, Fiber<Errors, Output>>
) => Fx<Services, Errors, Output> = flow(Effect.fromFiberEffect, fromEffect)

/* TODO: Implement comparable operators for Fx
Effect.absolve
Effect.absorb
Effect.absorbWith
Effect.acquireRelease
Effect.acquireReleaseInterruptible
Effect.acquireUseRelease
Effect.bind
Effect.bindValue
Effect.cached
Effect.cachedInvalidate
Effect.catchAllCause
Effect.catchAllDefect
Effect.catchSome
Effect.catchSomeCause
Effect.catchSomeDefect
Effect.catchTag
Effect.catchTags
Effect.cause
Effect.checkInterruptible
Effect.clock
Effect.clockWith
Effect.collect
Effect.collectAll
Effect.collectAllDiscard
Effect.collectAllPar
Effect.collectAllParDiscard
Effect.collectAllSuccesses
Effect.collectAllSuccessesPar
Effect.collectAllWith
Effect.collectAllWithEffect
Effect.collectAllWithPar
Effect.collectFirst
Effect.collectPar
Effect.collectWhile
Effect.daemonChildren
Effect.delay
Effect.descriptor
Effect.descriptorWith
Effect.either
Effect.ensuring
Effect.ensuringChild
Effect.ensuringChildren
Effect.eventually
Effect.exists
Effect.existsPar
Effect.exit
Effect.fail
Effect.failCauseSync
Effect.failSync
Effect.filter
Effect.filterNot
Effect.filterNotPar
Effect.filterOrDie
Effect.filterOrDieMessage
Effect.filterOrElse
Effect.filterOrElseWith
Effect.filterOrElseWith
Effect.filterOrFail
Effect.filterPar
Effect.find
Effect.firstSuccessOf
Effect.flattenErrorOption
Effect.flip
Effect.flipWith
Effect.forAll
Effect.forEach
Effect.forEachDiscard
Effect.forEachEffect
Effect.forEachExec
Effect.forEachOption
Effect.forEachPar
Effect.forEachParDiscard
Effect.forEachParWithIndex
Effect.forEachWithIndex
Effect.forever
Effect.fork
Effect.forkAll
Effect.forkAllDiscard
Effect.forkDaemon
Effect.forkIn
Effect.forkScoped
Effect.forkWithErrorHandler
Effect.fromEither
Effect.fromEitherCause
Effect.fromFiber
Effect.fromFiberEffect
Effect.getFiberRefs
Effect.getOrFail
Effect.getOrFailDiscard
Effect.getOrFailWith
Effect.head
Effect.ifEffect
Effect.ignore
Effect.ignoreLogged
Effect.inheritFiberRefs
Effect.interrupt
Effect.interruptWith
Effect.interruptible
Effect.interruptibleMask
Effect.intoDeferred
Effect.isEffect
Effect.isFailure
Effect.isSuccess
Effect.iterate
Effect.left
Effect.leftWith
Effect.log
Effect.logAnnotate
Effect.logAnnotations
Effect.logDebug
Effect.logDebugCause
Effect.logDebugCauseMessage
Effect.logError
Effect.logErrorCause
Effect.logErrorCauseMessage
Effect.logFatal
Effect.logFatalCause
Effect.logFatalCauseMessage
Effect.logInfo
Effect.logInfoCause
Effect.logInfoCauseMessage
Effect.logSpan
Effect.logTrace
Effect.logTraceCause
Effect.logTraceCauseMessage
Effect.logWarning
Effect.logWarningCause
Effect.logWarningCauseMessage
Effect.loop
Effect.loopDiscard
Effect.makeSemaphore
Effect.mapAccum
Effect.mapBoth
Effect.mapError
Effect.mapErrorCause
Effect.mapTryCatch
Effect.matchCause
Effect.matchCauseEffect
Effect.matchEffect
Effect.memoize
Effect.memoizeFunction
Effect.negate
Effect.never
Effect.none
Effect.noneOrFail
Effect.noneOrFailWith
Effect.onDone
Effect.onDoneCause
Effect.onError
Effect.onExit
Effect.onInterrupt
Effect.once
Effect.option
Effect.orDie
Effect.orDieWith
Effect.orElse
Effect.orElseEither
Effect.orElseFail
Effect.orElseOptional
Effect.orElseSucceed
Effect.parallelErrors
Effect.parallelFinalizers
Effect.partition
Effect.partitionPar
Effect.patchFiberRefs
Effect.provideContext
Effect.provideLayer
Effect.provideService
Effect.provideServiceEffect
Effect.provideSomeLayer
Effect.race
Effect.raceAll
Effect.raceAwait
Effect.raceEither
Effect.raceFibersWith
Effect.raceFirst
Effect.raceWith
Effect.random
Effect.randomWith
Effect.reduce
Effect.reduceAll
Effect.reduceAllPar
Effect.reduceRight
Effect.reduceWhile
Effect.refineOrDie
Effect.refineOrDieWith
Effect.refineTagOrDie
Effect.refineTagOrDieWith
Effect.reject
Effect.rejectEffect
Effect.repeat
Effect.repeatN
Effect.repeatOrElse
Effect.repeatOrElseEither
Effect.repeatUntil
Effect.repeatUntilEffect
Effect.repeatUntilEquals
Effect.repeatWhile
Effect.repeatWhileEffect
Effect.repeatWhileEquals
Effect.replicate
Effect.replicateEffect
Effect.replicateEffectDiscard
Effect.resurrect
Effect.retry
Effect.retryN
Effect.retryOrElse
Effect.retryOrElseEither
Effect.retryUntil
Effect.retryUntilEffect
Effect.retryUntilEquals
Effect.retryWhile
Effect.retryWhileEffect
Effect.retryWhileEquals
Effect.right
Effect.rightWith
Effect.runCallback
Effect.runFork
Effect.runPromise
Effect.runPromiseEither
Effect.runPromiseExit
Effect.runSync
Effect.runSyncEither
Effect.runSyncExit
Effect.runtime
Effect.runtimeFlags
Effect.sandbox
Effect.schedule
Effect.scheduleForked
Effect.scheduleFrom
Effect.scope
Effect.scopeWith
Effect.scoped
Effect.sequentialFinalizers
Effect.service
Effect.serviceWith
Effect.serviceWithEffect
Effect.setConfigProvider
Effect.setFiberRefs
Effect.sleep
Effect.some
Effect.someOrElse
Effect.someOrElseEffect
Effect.someOrFail
Effect.someOrFailException
Effect.someWith
Effect.succeedLeft
Effect.succeedNone
Effect.succeedRight
Effect.succeedSome
Effect.summarized
Effect.supervised
Effect.suspend
Effect.sync
Effect.tagged
Effect.taggedScoped
Effect.taggedScopedWithLabelSet
Effect.taggedScopedWithLabels
Effect.taggedWithLabelSet
Effect.taggedWithLabels
Effect.tags
Effect.takeWhile
Effect.tap
Effect.tapBoth
Effect.tapDefect
Effect.tapEither
Effect.tapError
Effect.tapErrorCause
Effect.tapSome
Effect.timed
Effect.timedWith
Effect.timeout
Effect.timeoutFail
Effect.timeoutFailCause
Effect.timeoutTo
Effect.toLayer
Effect.toLayerContext
Effect.toLayerDiscard
Effect.toLayerScoped
Effect.toLayerScopedDiscard
Effect.transplant
Effect.tryCatch
Effect.tryCatchPromise
Effect.tryCatchPromiseInterrupt
Effect.tryOrElse
Effect.tryPromise
Effect.tryPromiseInterrupt
Effect.uncause
Effect.unfold
Effect.unified
Effect.uninterruptible
Effect.uninterruptibleMask
Effect.unit
Effect.unleft
Effect.unless
Effect.unlessEffect
Effect.unrefine
Effect.unrefineWith
Effect.unright
Effect.unsandbox
Effect.unsome
Effect.updateFiberRefs
Effect.updateRuntimeFlags
Effect.updateService
Effect.using
Effect.validate
Effect.validateAll
Effect.validateAllDiscard
Effect.validateAllPar
Effect.validateAllParDiscard
Effect.validateFirst
Effect.validateFirstPar
Effect.validatePar
Effect.validateWith
Effect.validateWithPar
Effect.when
Effect.whenCase
Effect.whenCaseEffect
Effect.whenEffect
Effect.whenFiberRef
Effect.whenRef
Effect.whileLoop
Effect.withClock
Effect.withClockScoped
Effect.withConfigProvider
Effect.withConfigProviderScoped
Effect.withEarlyRelease
Effect.withMetric
Effect.withParallelism
Effect.withParallelismUnbounded
Effect.withRuntimeFlags
Effect.withRuntimeFlagsScoped
Effect.yieldNow
Effect.zip
Effect.zipLeft
Effect.zipPar
Effect.zipParLeft
Effect.zipParRight
Effect.zipRight
Effect.zipWith
Effect.zipWithPar
*/
