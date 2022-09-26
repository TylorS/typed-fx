// import * as M from '@most/core'
// import { pipe } from 'hkt-ts'
// import * as N from 'hkt-ts/number'
// import * as rxjs from 'rxjs'

// import {
//   array,
//   fxTest,
//   iterations,
//   mostStreamTest,
//   runPerformanceTest,
//   rxjsObservableTest,
// } from './_internal.js'

// import * as Stream from '@/Stream/index.js'

// const nestedArray = array.map((x) => Array.from({ length: x }, (_, i) => x * 1000 + i))

// runPerformanceTest({
//   name: 'switchMap ' + iterations + ' integers',
//   cases: [
//     fxTest(() =>
//       pipe(
//         Stream.fromArray(nestedArray),
//         Stream.switchMap(Stream.fromArray),
//         Stream.foldLeft(N.IdentitySum),
//       ),
//     ),
//     mostStreamTest(() =>
//       pipe(
//         M.periodic(0),
//         M.withItems(nestedArray),
//         M.map((ns) => pipe(M.periodic(0), M.withItems(ns))),
//         M.switchLatest,
//         M.scan(N.IdentitySum.concat, 0),
//       ),
//     ),
//     rxjsObservableTest(() =>
//       pipe(rxjs.from(nestedArray), rxjs.switchMap(rxjs.from), rxjs.scan(N.IdentitySum.concat, 0)),
//     ),
//   ],
// })
