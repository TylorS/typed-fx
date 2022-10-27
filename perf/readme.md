# Performance Tests

Here is the latest output of the perf test suite run on a 2020 13" macbook pro.
It is worth noting that all the tests utilize entirely synchronous workflows, and thus
have a great favoring towards Most.js/RxJS in terms of raw performance overhead. 

If you need strict performance over push-based streams, definitely use Most.js, but if you are
interested in the superpowers of `Effect`, and are interested in using push-based streams as a means
of orchestration `Fx` is still a great bet as it won't often be your bottleneck.

If you need strict performance no matter what, none of these abstractions should be utilized at all.

## Test Results

### filter -> map -> scan 10000 integers
| Library       | Ops/sec    | ±      | Samples |
| --------------|------------|--------|---------|
| Fx            | 3801.43    | 5.81%  | 82      |
| @most/core    | 384094.58  | 12.96% | 64      |
| RxJS @7       | 2255.04    | 12.60% | 87      |
| Effect/Stream | 91.50      | 29.12% | 41      |
-------------------------------------------------------

### flatMap 10000 x 10000 integers
| Library       | Ops/sec    | ±      | Samples |
| --------------|------------|--------|---------|
| Fx            | 6474.91    | 11.85% | 76      |
| @most/core    | 276654.02  | 19.33% | 46      |
| RxJS @7       | 10322.11   | 52.99% | 77      |
| Effect/Stream | 2.29       | 124.34% | 9      |
-------------------------------------------------------

### switchMap 10000 x 10000 integers
| Library       | Ops/sec    | ±      | Samples |
| --------------|------------|--------|---------|
| Fx            | 4759.84    | 13.52% | 63      |
| @most/core    | 300663.64  | 14.57% | 55      |
| RxJS @7       | 16469.83   | 2.63%  | 75      |
-------------------------------------------------------

