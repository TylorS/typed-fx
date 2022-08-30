/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-named-as-default-member */
import { relative } from 'path'

import { ProgramPattern } from 'ts-patch'
import ts from 'typescript'

const INSTRUMENTED_REGEX = /^[a-z]+\s.+:[0-9]+:[0-9]+$/i

const isInstrumentedTrace = (trace: string) => INSTRUMENTED_REGEX.test(trace)

export interface TracingPluginOptions {
  readonly root?: string
  readonly rewritePaths?: ReadonlyArray<readonly [string, string]>
}

export const makeTracingTransformer = (program: ts.Program, config: TracingPluginOptions) => {
  const checker = program.getTypeChecker()
  const root = config?.root ?? program.getCompilerOptions().rootDir ?? process.cwd()

  return (ctx: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      const fileName = rewritePaths(relative(root, sourceFile.fileName), config.rewritePaths)

      function getTrace(node: ts.Node, existingText?: string): ts.Expression {
        const nodeEnd = sourceFile.getLineAndCharacterOfPosition(node.getEnd())

        // Must be an expression, so we create a binary expression to concatenate the 2 parts of the string
        // and to handle existing expressions in existingText.
        const expression = ts.factory.createBinaryExpression(
          ts.factory.createStringLiteral(
            existingText ? trimQuotations(existingText) : node.getText(),
          ),
          ts.factory.createToken(ts.SyntaxKind.PlusToken),
          ts.factory.createStringLiteral(
            ` ${fileName}:${nodeEnd.line + 1}:${nodeEnd.character + 1}`,
          ),
        )

        return expression
      }

      function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
        if (ts.isCallExpression(node)) {
          // Continue processing any arguments that might be CallExpressions
          const processedArguments = ts.visitNodes(node.arguments, visitor)

          // Resolve signature to get the declaration parameters.
          const signature =
            checker.getResolvedSignature(node) ?? getSignatureIfSole(checker, node.expression)
          const signatureDeclaration = signature?.getDeclaration()
          const declarationParameters = Array.from(signatureDeclaration?.parameters || [])

          // Grab the last argument and last declaration parameter.
          const lastParameter = processedArguments[processedArguments.length - 1]
          const lastDeclarationParameter = declarationParameters[declarationParameters.length - 1]

          // Check if this function should append a trace, and how.
          const isTraceLastParameter = lastDeclarationParameter?.name.getText() === '__trace'
          const haveNotProvidedTrace =
            processedArguments.length === declarationParameters.length - 1
          const traceIsMissingLocation =
            processedArguments.length === declarationParameters.length && lastParameter
              ? lastParameter.getText(sourceFile) !== '__trace' &&
                !isInstrumentedTrace(lastParameter.getText(sourceFile))
              : false
          const shouldAppendTrace =
            isTraceLastParameter && (haveNotProvidedTrace || traceIsMissingLocation)

          // Update the CallExpression
          return ts.factory.updateCallExpression(
            node,
            ts.visitNode(node.expression, visitor), // Process the expression
            node.typeArguments,
            shouldAppendTrace
              ? haveNotProvidedTrace
                ? [...node.arguments, getTrace(node.expression)] // Append new Trace
                : [
                    // Ammend existing custom Trace with line numbers
                    ...node.arguments.slice(0, -1),
                    getTrace(node.expression, lastParameter.getText(sourceFile)),
                  ]
              : node.arguments, // Don't do anything
          )
        }

        if (ts.isNewExpression(node)) {
          // Continue processing any arguments that might be CallExpressions
          const processedArguments = ts.visitNodes(node.arguments, visitor)

          // Resolve signature to get the declaration parameters.
          const signature =
            checker.getResolvedSignature(node) ?? getSignatureIfSole(checker, node.expression)
          const signatureDeclaration = signature?.getDeclaration()
          const declarationParameters = Array.from(signatureDeclaration?.parameters || [])

          // Grab the last argument and last declaration parameter.
          const lastParameter = processedArguments
            ? processedArguments[processedArguments.length - 1]
            : null
          const lastDeclarationParameter = declarationParameters[declarationParameters.length - 1]

          // Check if this function should append a trace, and how.
          const isTraceLastParameter = lastDeclarationParameter?.name.getText() === '__trace'
          const haveNotProvidedTrace =
            processedArguments?.length === declarationParameters.length - 1
          const traceIsMissingLocation =
            processedArguments?.length === declarationParameters.length && lastParameter
              ? lastParameter.getText(sourceFile) !== '__trace' &&
                !isInstrumentedTrace(lastParameter.getText(sourceFile))
              : false
          const shouldAppendTrace =
            isTraceLastParameter && (haveNotProvidedTrace || traceIsMissingLocation)

          return ts.factory.updateNewExpression(
            node,
            ts.visitNode(node.expression, visitor),
            node.typeArguments,
            shouldAppendTrace
              ? haveNotProvidedTrace
                ? [...(node.arguments ?? []), getTrace(node.expression)] // Append new Trace
                : [
                    // Ammend existing custom Trace with line numbers
                    ...(node.arguments ?? []).slice(0, -1),
                    getTrace(node.expression, lastParameter!.getText(sourceFile)),
                  ]
              : node.arguments,
          )
        }

        // Ensure we traverse through variable declarations
        if (ts.isVariableDeclaration(node)) {
          return ts.factory.updateVariableDeclaration(
            node,
            node.name,
            node.exclamationToken,
            node.type,
            ts.visitEachChild(node.initializer, visitor, ctx),
          )
        }

        // Keep traversing through the rest of the tree
        return ts.visitEachChild(node, visitor, ctx)
      }

      return ts.visitEachChild(sourceFile, visitor, ctx)
    }
  }
}

export default makeTracingTransformer as ProgramPattern

function getSignatureIfSole(
  checker: ts.TypeChecker,
  node: ts.Expression,
): ts.Signature | undefined {
  const ds = checker.getTypeAtLocation(node).getCallSignatures()

  if (ds?.length !== 1) {
    return undefined
  }

  return ds?.[0]
}

const quotes = [`'`, `"`]

function trimQuotations(s: string) {
  if (s.length === 0) {
    return s
  }

  if (quotes.includes(s[0])) {
    s = s.slice(1)
  }

  if (quotes.includes(s[s.length - 1])) {
    s = s.slice(0, -1)
  }

  return s
}

function rewritePaths(
  path: string,
  rewritePaths?: ReadonlyArray<readonly [string, string]>,
): string {
  if (!rewritePaths) {
    return path
  }

  for (const [from, to] of rewritePaths) {
    const fromRegex = new RegExp(from, 'g')

    path = path.replace(fromRegex, to)
  }

  return path
}
