import * as M from 'hkt-ts/Maybe'
import { pipe } from 'hkt-ts/function'

import type { Cause, Expected, Interrupted, Unexpected } from './Cause.js'
import { prettyStringify } from './prettyStringify.js'

import { Debug as FiberIdDebug } from '@/FiberId/index.js'
import { Trace, Debug as TraceDebug } from '@/Trace/index.js'

export interface Renderer<E> {
  readonly renderError: (error: E, hasTrace: boolean) => Lines
  readonly renderUnknown: (error: unknown, hasTrace: boolean) => Lines
  readonly renderTrace: TraceRenderer
}

export type TraceRenderer = (trace: Trace) => string

/**
 * Each item in the array represents a newline
 */
export type Lines = readonly string[]

export type Segment = Sequential | Parallel | Failure

export type Step = Parallel | Failure

export interface Failure {
  readonly type: 'Failure'
  readonly lines: Lines
}

export interface Parallel {
  readonly type: 'Parallel'
  readonly all: readonly Sequential[]
}

export interface Sequential {
  readonly type: 'Sequential'
  readonly all: readonly Step[]
}

export function Failure(lines: readonly string[]): Failure {
  return {
    type: 'Failure',
    lines,
  }
}

export function Sequential(all: readonly Step[]): Sequential {
  return {
    type: 'Sequential',
    all,
  }
}

export function Parallel(all: readonly Sequential[]): Parallel {
  return {
    type: 'Parallel',
    all,
  }
}

export function renderInterrupted<E>(
  cause: Interrupted,
  trace: M.Maybe<Trace>,
  renderer: Renderer<E>,
): Sequential {
  return Sequential([
    Failure([
      `Interrupted by ${FiberIdDebug.debug(cause.fiberId)}.`,
      '',
      ...renderTrace(trace, renderer),
    ]),
  ])
}

export function renderExpected<E>(
  cause: Expected<E>,
  trace: M.Maybe<Trace>,
  renderer: Renderer<E>,
) {
  return Sequential([
    Failure([
      'An expected error has occurred.',
      '',
      ...renderer.renderError(
        cause.error,
        M.isJust(trace) && trace.value.tag !== 'EmptyTrace' && trace.value.frames.length > 0,
      ),
      ...renderTrace(trace, renderer),
    ]),
  ])
}

export function renderUnexpected<E>(
  cause: Unexpected,
  trace: M.Maybe<Trace>,
  renderer: Renderer<E>,
) {
  return Sequential([
    Failure([
      'An unexpected error has occurred.',
      '',
      ...renderer.renderUnknown(
        cause.error,
        M.isJust(trace) && trace.value.tag !== 'EmptyTrace' && trace.value.frames.length > 0,
      ),
      ...renderTrace(trace, renderer),
    ]),
  ])
}

export function renderCauseToSequential<E>(cause: Cause<E>, renderer: Renderer<E>): Sequential {
  switch (cause.tag) {
    case 'Empty':
      return Sequential([])
    case 'Expected':
      return renderExpected(cause, M.Nothing, renderer)
    case 'Unexpected':
      return renderUnexpected(cause, M.Nothing, renderer)
    case 'Interrupted':
      return renderInterrupted(cause, M.Nothing, renderer)
    case 'Sequential':
      return Sequential(linearSegments(cause, renderer))
    case 'Parallel':
      return Sequential([Parallel(parrallelSegments(cause, renderer))])
    case 'Traced': {
      switch (cause.cause.tag) {
        case 'Expected':
          return renderExpected(cause.cause, M.Just(cause.trace), renderer)
        case 'Unexpected':
          return renderUnexpected(cause.cause, M.Just(cause.trace), renderer)
        case 'Interrupted':
          return renderInterrupted(cause.cause, M.Just(cause.trace), renderer)
        default: {
          const { all }: Sequential = renderCauseToSequential(cause.cause, renderer)
          const rendered = renderTrace(M.Just(cause.trace), renderer)

          return Sequential([
            ...(rendered.every((x) => includes(all, x))
              ? []
              : [Failure(['An error was rethrown with a new trace.', ...rendered])]),
            ...all,
          ])
        }
      }
    }
  }
}

function includes(steps: ReadonlyArray<Step>, value: string): boolean {
  // Reverse steps as this will usually be at the bottom of the previous section
  for (const step of steps.slice().reverse()) {
    if (stepIncludes(step, value)) {
      return true
    }
  }

  return false
}

function stepIncludes(step: Step, value: string): boolean {
  switch (step.type) {
    case 'Failure':
      return step.lines.includes(value)
    case 'Parallel':
      return includes(
        step.all.flatMap((s) => s.all),
        value,
      )
  }
}

export function linearSegments<E>(cause: Cause<E>, renderer: Renderer<E>): readonly Step[] {
  switch (cause.tag) {
    case 'Sequential':
      return [...linearSegments(cause.left, renderer), ...linearSegments(cause.right, renderer)]
    default:
      return renderCauseToSequential(cause, renderer).all
  }
}

export function parrallelSegments<E>(
  cause: Cause<E>,
  renderer: Renderer<E>,
): readonly Sequential[] {
  switch (cause.tag) {
    case 'Parallel':
      return [
        ...parrallelSegments(cause.left, renderer),
        ...parrallelSegments(cause.right, renderer),
      ]
    default:
      return [renderCauseToSequential(cause, renderer)]
  }
}

export function renderError(error: Error, hasTrace = false): Lines {
  return hasTrace ? lines(`${error.name}: ${error.message}`) : lines(String(error))
}

export function renderTrace<E>(trace: M.Maybe<Trace>, renderer: Renderer<E>): Lines {
  return pipe(
    trace,
    M.match(
      () => [],
      (trace) => lines(addPadding(renderer.renderTrace(trace))),
    ),
  )
}

export function lines(s: string): Lines {
  return s.split('\n').map((s) => s.replace('\r', ''))
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function renderString(u: any): string {
  const s = u?.toString?.()
  const shouldJsonify = !s || s.trim().startsWith('[object')

  return shouldJsonify ? prettyStringify(u) : s
}

export function prefixBlock(lines: Lines, headPrefix: string, tailPrefix: string): Lines {
  if (lines.length === 0) {
    return []
  }

  const [head, ...tail] = lines

  return [`${headPrefix}${head}`, ...tail.map((t) => `${tailPrefix}${t}`)]
}

export function format(segment: Segment): Lines {
  switch (segment.type) {
    case 'Failure': {
      return prefixBlock(segment.lines, '─', ' ')
    }
    case 'Parallel': {
      return [
        '══╦'.repeat(segment.all.length - 1) + '══╗',
        ...segment.all.reduceRight(
          (acc: Lines, current: Sequential): Lines => [
            ...prefixBlock(acc, '  ║', '  ║'),
            ...prefixBlock(format(current), '  ', '  '),
          ],
          [],
        ),
      ]
    }
    case 'Sequential': {
      return segment.all.flatMap((seg) => ['║', ...prefixBlock(format(seg), '╠', '║'), '▼'])
    }
  }
}

export function prettyLines<E>(cause: Cause<E>, renderer: Renderer<E>): Lines {
  const s = renderCauseToSequential(cause, renderer)

  if (s.all.length === 1 && s.all[0].type === 'Failure') {
    return s.all[0].lines
  }

  const formatted = format(s)

  return formatted.length === 0 ? [] : ['╥', ...formatted.slice(1)]
}

export function defaultErrorToLines(error: unknown, hasTrace = false): Lines {
  return error instanceof Error ? renderError(error, hasTrace) : lines(renderString(error))
}

export const defaultRenderer: Renderer<unknown> = {
  renderError: defaultErrorToLines,
  renderUnknown: defaultErrorToLines,
  // Add 4 spaces of padding like most JS runtimes.
  renderTrace: TraceDebug.debug,
}

// Add 4-spaces of padding like most JS runtimes do for stack traces.
function addPadding(s: string): string {
  return '    ' + s.replace(/\n/g, '\n    ')
}

export function prettyPrint<E>(cause: Cause<E>, renderer: Renderer<E> = defaultRenderer): string {
  const lines = prettyLines(cause, renderer)

  return `\n${lines.join('\n')}`.trimEnd()
}
