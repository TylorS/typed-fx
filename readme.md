# @typed/fx

Fx is a generator-based abstraction for describing applications that run within Fibers. 
The Fiber runtime interprets these generators into running applications that process side-effects. 


## Features

- Concurrency - never encounter a race condition, control the level of concurrency at any level.
- Resources Safety - release unused resources at just the right time, even in the event of failures.
- Resilient - type-safe errors that will never be swallowed.
- Interruptable - Cancel Fx you're no longer interested in, or mark regions as uninterruptible to avoid errors.
- Dependency injection - Use the type-checker to ensure your programs are properly constructed.
- Streams - Push-based streams, modeled after [@most/core](https://github.com/mostjs/core), with full Fx integration.
- Tracing - Use our TypeScript/Vite plugin to use the TypeScript compiler to augment your stack traces with more useful information.
- Logging - Built-in Loggers w/ configurable backends
- State Management - Manage and synchronize state effortlessly across all your running processes.

## Target 

This library is primarily designed for front-end applications (including server-side rendering), that is to say,
bundle size, parse time, memory constraints, etc. are of great concern. There will always be a balancing act between
these metrics, ergonomics, and feature-set. We'll attempt to tread these lines as best we can, but Fx is highly feature-rich
as it is, and can be used to build many many more abstractions that are not yet available as 3rd party plugins.

The full library, and its dependencies, are about 30kb minified + gzipped. 
However, it is provided as ES modules and is highly tree-shakeable. Take only what you need.

## Come Back Soon

There's not a lot else to see here yet, this library is under very active development and will continue to be updated with more docs and 
information on how to use it. Check back soon! 

If you're interested in chatting about the project come on over and join us on [Discord](https://discord.com/invite/kpPHEvkaAv)!
