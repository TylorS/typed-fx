import { Project } from 'ts-morph'
import ts from 'typescript'
import type { Plugin } from 'vite'

import { makeTracingTransformer } from './plugin.js'

export interface TracingParams {
  // Where to find the tsconfig.json file.
  readonly tsconfig: string

  // Where to run this plugin
  readonly build?: boolean
  readonly serve?: boolean
  readonly dev?: boolean
  readonly ssr?: boolean
}

const jsRegex = /.([c|m]?jsx?)$/
const jsMapRegex = /.js.map$/
const name = '@typed/fx/Tracing'

export function tracingPlugin(params: TracingParams): Plugin {
  console.info(`${name} :: Setting up TypeScript project...`)
  const project = new Project({ tsConfigFilePath: params.tsconfig })
  console.info(`${name} :: TypeScript project ready.`)

  let customTransformers: ts.CustomTransformers | undefined
  return {
    name,
    apply(_, env) {
      const shouldRunCommand = env.command === 'build' ? params.build ?? true : params.serve ?? true
      const shouldRunMode = env.mode === 'dev' ? params.dev ?? true : true
      const shouldRunSsr = env.ssrBuild === true ? params.ssr ?? true : true

      return shouldRunCommand && shouldRunMode && shouldRunSsr
    },

    configResolved(config) {
      customTransformers = {
        before: [
          makeTracingTransformer(project.getProgram().compilerObject, {
            root: config.root,
          }),
        ],
      }
    },

    async transform(src, id) {
      if (id.includes('node_modules')) {
        return
      }

      const sourceFile = project.createSourceFile(id, src, { overwrite: true })
      const output = project.emitToMemory({
        targetSourceFile: sourceFile,
        customTransformers,
      })
      const files = output.getFiles()
      const source = files.find((x) => jsRegex.test(x.filePath))
      const sourceMap = files.find((x) => jsMapRegex.test(x.filePath))

      if (!source) {
        return
      }

      return {
        code: source.text,
        map: sourceMap?.text,
      }
    },
  }
}
