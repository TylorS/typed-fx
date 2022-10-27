# Performance Tests

Here is the latest output of the perf test suite run on a 2020 13" macbook pro.
It is worth noting that all the tests utilize entirely synchronous workflows, and thus
have a great favoring towards Most.js/RxJS in terms of raw performance overhead. 

If you need strict performance over push-based streams, definitely use Most.js, but if you are
interested in the superpowers of `Effect`, and are interested in using push-based streams as a means
of orchestration `Fx` is still a great bet as it won't often be your bottleneck.

If you need strict performance no matter what, none of these abstractions should be utilized at all.

## Test Results

filter -> map -> scan 10000 integers
-------------------------------------------------------
Fx                 3932.81 op/s ±  8.22%   (82 samples)
@most/core        353745.06 op/s ± 13.42%   (60 samples)
RxJS @7            2253.41 op/s ±  1.41%   (89 samples)
Effect/Stream        67.57 op/s ± 75.41%   (37 samples)
-------------------------------------------------------

flatMap 10000 x 10000 integers
-------------------------------------------------------
Fx                 7442.81 op/s ±  8.70%   (68 samples)
@most/core        200787.55 op/s ± 11.99%   (56 samples)
RxJS @7           22591.12 op/s ± 13.91%   (53 samples)
switchMap 10000 x 10000 integers
-------------------------------------------------------
Fx                 5036.53 op/s ± 13.88%   (60 samples)
@most/core        231046.49 op/s ± 15.07%   (48 samples)
RxJS @7           18226.43 op/s ± 55.02%   (48 samples)
-------------------------------------------------------

