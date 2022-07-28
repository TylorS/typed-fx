/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-named-as-default-member */
import { relative } from 'path'

import { ProgramPattern } from 'ttypescript/lib/PluginCreator.js'
import ts from 'typescript'

const INSTRUMENTED_REGEX = /^[a-z]+\s.+:[0-9]+:[0-9]+$/i

const isInstrumentedTrace = (trace: string) => INSTRUMENTED_REGEX.test(trace)

export const tracingPlugin = (program: ts.Program, config: { readonly root?: string }) => {
  const checker = program.getTypeChecker()
  const root = config?.root ?? program.getCompilerOptions().rootDir ?? process.cwd()

  return (ctx: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      const fileName = relative(root, sourceFile.fileName)

      function getTrace(node: ts.Node, exisingText?: string): ts.Expression {
        const nodeEnd = sourceFile.getLineAndCharacterOfPosition(node.getEnd())

        // Must be an expression, so we create a binary expression to concatenate the 2 parts of the string
        // and to handle existing expressions in existingText.
        const expression = ts.factory.createBinaryExpression(
          ts.factory.createStringLiteral(
            exisingText ? trimQuotations(exisingText) : node.getText(),
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

          // Reolve signature to get the declaration parameters.
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
              ? traceIsMissingLocation && !haveNotProvidedTrace // Ammend existing custom Trace with line numbers
                ? [
                    ...node.arguments.slice(0, -1),
                    getTrace(node.expression, lastParameter.getText(sourceFile)),
                  ]
                : [...node.arguments, getTrace(node.expression)] // Append new Trace
              : node.arguments, // Don't do anything
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

export default tracingPlugin as ProgramPattern

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
