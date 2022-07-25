/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-named-as-default-member */
import { relative } from 'path'

import { ts } from 'ts-morph'

const INSTRUMENTED_REGEX = /^[a-z]+\s.+:[0-9]+:[0-9]+$/i

const isInstrumentedTrace = (trace: string) => INSTRUMENTED_REGEX.test(trace)

export default function tracer(program: ts.Program, config?: { readonly root?: string }) {
  const checker = program.getTypeChecker()
  const root = config?.root ?? program.getCompilerOptions().rootDir ?? process.cwd()

  return {
    before: (ctx: ts.TransformationContext) => {
      return (sourceFile: ts.SourceFile) => {
        const fileName = relative(root, sourceFile.fileName)

        function getTrace(node: ts.Node, exisingText?: string): ts.Expression {
          const nodeEnd = sourceFile.getLineAndCharacterOfPosition(node.getEnd())
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
            const signature =
              checker.getResolvedSignature(node) ?? getSignatureIfSole(checker, node.expression)
            const signatureDeclaration = signature?.getDeclaration()
            const declarationParameters = Array.from(signatureDeclaration?.parameters || [])
            const processedArguments = ts.visitNodes(node.arguments, visitor)

            const lastDeclarationParameter = declarationParameters[declarationParameters.length - 1]
            const lastParameter = processedArguments[processedArguments.length - 1]

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

            const updated = ts.factory.updateCallExpression(
              node,
              ts.visitNode(node.expression, visitor),
              node.typeArguments,
              shouldAppendTrace
                ? traceIsMissingLocation && !haveNotProvidedTrace
                  ? [
                      ...node.arguments.slice(0, -1),
                      getTrace(
                        node.expression,
                        processedArguments[processedArguments.length - 1].getText(sourceFile),
                      ),
                    ]
                  : [...node.arguments, getTrace(node.expression)]
                : node.arguments,
            )

            return updated
          }

          if (ts.isVariableDeclaration(node)) {
            return ts.factory.updateVariableDeclaration(
              node,
              node.name,
              node.exclamationToken,
              node.type,
              ts.visitEachChild(node.initializer, visitor, ctx),
            )
          }

          return ts.visitEachChild(node, visitor, ctx)
        }

        return ts.visitEachChild(sourceFile, visitor, ctx)
      }
    },
  }
}

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
