import { Project, ts } from 'ts-morph'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import type { Plugin } from 'vite'

import tracingPlugin from './plugin'

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

export function tracingPlugin(params: TracingParams): Plugin {
  const initial = new Project({
    tsConfigFilePath: params.tsconfig,
    compilerOptions: {
      outDir: 'node_modules/.fx-tracing-plugin',
    },
  })
  const project = new Project({
    compilerOptions: initial.getCompilerOptions(),
    skipAddingFilesFromTsConfig: true,
    useInMemoryFileSystem: true,
  })

  initial
    .getSourceFiles()
    .forEach((file) => project.createSourceFile(file.getFilePath(), file.getText()))

  let customTransformers: ts.CustomTransformers | undefined
  return {
    name: '@typed/fx/tracing',
    enforce: 'pre',

    apply(_, env) {
      const shouldRunCommand = env.command === 'build' ? params.build ?? true : params.serve ?? true
      const shouldRunMode = env.mode === 'dev' ? params.dev ?? true : true
      const shouldRunSsr = env.ssrBuild === true ? params.ssr ?? true : true

      return shouldRunCommand && shouldRunMode && shouldRunSsr
    },

    configResolved(config) {
      customTransformers = {
        before: [tracingPlugin(project.getProgram().compilerObject, { root: config.root }).before],
      }
    },

    async transform(src, id, options) {
      if ((options?.ssr && params.ssr === false) || id.includes('node_modules')) {
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
