# Performance Tests

Here is the latest output of the perf test suite run on a 2020 13" macbook pro.
It is worth noting that all the tests utilize entirely synchronous workflows, and thus
have a great favoring towards Most.js/RxJS in terms of raw performance overhead. 

If you need strict performance over push-based streams, definitely use Most.js, but if you are
interested in the superpowers of `Effect`, and are interested in using push-based streams as a means
of orchestration `Fx` is still a great bet as it won't often be your bottleneck.

If you need strict performance no matter what, none of these abstractions should be utilized at all.

## Test Results

